/**
 * @file src/modules/doctors/doctors.service.ts
 * @description Business logic cho Doctor và Doctor Schedules module
 *
 * Tính năng chính:
 * - Quản lý thông tin bác sĩ: Chuyên khoa, số phòng khám, giá khám cơ bản
 * - Cấu hình lịch làm việc chia theo slot thời gian (VD: 08:00 - 08:30, tối đa 3 BN/slot)
 * - Tự động chia ca làm việc lớn thành các slot nhỏ liền kề
 * - Validation chống trùng khung giờ cho cùng 1 bác sĩ hoặc cùng 1 phòng khám
 * - Tra cứu các slot còn trống của từng bác sĩ theo ngày hoặc theo tuần
 */

import { AppDataSource } from '../../config/database';
import { Doctor } from '../../models/Doctor.entity';
import { DoctorSchedule, DayOfWeek } from '../../models/DoctorSchedule.entity';
import { User, UserRole } from '../../models/User.entity';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../exceptions/AppError';
import { paginate } from '../../utils/pagination';
import type {
  UpdateDoctorProfileDto,
  CreateDoctorScheduleDto,
  BulkCreateDoctorScheduleDto,
  AvailableSlotsQueryDto,
} from './doctors.dto';

export class DoctorsService {
  private doctorRepo = AppDataSource.getRepository(Doctor);
  private scheduleRepo = AppDataSource.getRepository(DoctorSchedule);

  // ============================================================
  // 1. QUẢN LÝ THÔNG TIN BÁC SĨ
  // ============================================================

  /**
   * Lấy danh sách bác sĩ kèm phân trang và lọc theo chuyên khoa
   */
  async findAll(query: { page?: number; limit?: number; specialty?: string; search?: string }) {
    const qb = this.doctorRepo
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .where('user.isActive = true')
      .orderBy('doctor.rating', 'DESC');

    if (query.specialty) {
      qb.andWhere('doctor.specialty = :specialty', { specialty: query.specialty });
    }

    if (query.search) {
      qb.andWhere('(user.fullName ILIKE :search OR doctor.roomNumber ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    return paginate(qb, {
      page: Number(query.page) || 1,
      limit: Number(query.limit) || 10,
    });
  }

  /**
   * Lấy chi tiết hồ sơ bác sĩ
   */
  async findById(id: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({
      where: { id },
      relations: ['user', 'schedules'],
    });

    if (!doctor) {
      throw new NotFoundError('Hồ sơ bác sĩ không tồn tại');
    }

    return doctor;
  }

  /**
   * Cập nhật thông tin bác sĩ (Chuyên khoa, số phòng, phí khám cơ bản,...)
   */
  async update(id: string, dto: UpdateDoctorProfileDto, currentUser?: User): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundError('Hồ sơ bác sĩ không tồn tại');
    }

    // Kiểm tra quyền: Chỉ Admin hoặc chính bác sĩ đó mới được cập nhật
    if (currentUser && currentUser.role === UserRole.DOCTOR && doctor.userId !== currentUser.id) {
      throw new ForbiddenError('Bạn chỉ có quyền cập nhật hồ sơ của chính mình');
    }

    Object.assign(doctor, dto);
    return this.doctorRepo.save(doctor);
  }

  // ============================================================
  // 2. CẤU HÌNH VÀ QUẢN LÝ LỊCH LÀM VIỆC (SLOTS)
  // ============================================================

  /**
   * Tạo một slot làm việc đơn lẻ
   * - Kiểm tra trùng khung giờ cho cùng bác sĩ
   * - Kiểm tra trùng khung giờ cho cùng phòng khám
   */
  async createSchedule(dto: CreateDoctorScheduleDto, currentUser?: User): Promise<DoctorSchedule> {
    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) {
      throw new NotFoundError('Bác sĩ không tồn tại');
    }

    if (currentUser && currentUser.role === UserRole.DOCTOR && doctor.userId !== currentUser.id) {
      throw new ForbiddenError('Bác sĩ chỉ được đăng ký lịch làm việc cho chính mình');
    }

    const roomNumber = dto.roomNumber || doctor.roomNumber || 'Phòng khám đa khoa';

    // Validation: Không được tạo trùng khung giờ cho cùng bác sĩ hoặc cùng phòng khám
    await this.validateNoOverlap({
      doctorId: dto.doctorId,
      workDate: dto.workDate,
      startTime: dto.startTime,
      endTime: dto.endTime,
      roomNumber,
    });

    const dayOfWeek = this.calculateDayOfWeek(dto.workDate);

    const schedule = this.scheduleRepo.create({
      doctorId: dto.doctorId,
      workDate: new Date(dto.workDate) as unknown as Date,
      dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
      roomNumber,
      maxPatients: dto.maxPatients,
      bookedPatients: 0,
      isAvailable: true,
      notes: dto.notes,
    });

    return this.scheduleRepo.save(schedule);
  }

  /**
   * Đăng ký ca làm việc lớn và tự động chia thành các slot nhỏ
   * Ví dụ ca 08:00 - 11:30 chia thành các slot 30 phút (08:00-08:30, 08:30-09:00,...)
   */
  async bulkCreateSchedule(
    dto: BulkCreateDoctorScheduleDto,
    currentUser?: User,
  ): Promise<DoctorSchedule[]> {
    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) {
      throw new NotFoundError('Bác sĩ không tồn tại');
    }

    if (currentUser && currentUser.role === UserRole.DOCTOR && doctor.userId !== currentUser.id) {
      throw new ForbiddenError('Bác sĩ chỉ được đăng ký lịch làm việc cho chính mình');
    }

    const roomNumber = dto.roomNumber || doctor.roomNumber || 'Phòng khám đa khoa';
    const slots = this.generateTimeSlots(
      dto.shiftStartTime,
      dto.shiftEndTime,
      dto.slotDurationMinutes,
    );

    if (slots.length === 0) {
      throw new BadRequestError('Không thể tạo slot nào từ khung giờ ca làm việc đã chọn');
    }

    // Kiểm tra trùng lặp cho từng slot
    for (const slot of slots) {
      await this.validateNoOverlap({
        doctorId: dto.doctorId,
        workDate: dto.workDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        roomNumber,
      });
    }

    const dayOfWeek = this.calculateDayOfWeek(dto.workDate);

    // Lưu các slot trong transaction
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const createdSchedules: DoctorSchedule[] = [];
      for (const slot of slots) {
        const schedule = queryRunner.manager.create(DoctorSchedule, {
          doctorId: dto.doctorId,
          workDate: new Date(dto.workDate) as unknown as Date,
          dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          roomNumber,
          slotDurationMinutes: dto.slotDurationMinutes,
          maxPatients: dto.maxPatientsPerSlot,
          bookedPatients: 0,
          isAvailable: true,
          notes: dto.notes,
        });
        const saved = await queryRunner.manager.save(schedule);
        createdSchedules.push(saved);
      }

      await queryRunner.commitTransaction();
      return createdSchedules;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tra cứu các slot còn trống của bác sĩ theo ngày hoặc theo tuần
   */
  async getAvailableSlots(doctorId: string, query: AvailableSlotsQueryDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });
    if (!doctor) {
      throw new NotFoundError('Bác sĩ không tồn tại');
    }

    const qb = this.scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.doctorId = :doctorId', { doctorId })
      .andWhere('schedule.isAvailable = true')
      .andWhere('schedule.bookedPatients < schedule.maxPatients');

    if (query.date) {
      qb.andWhere('schedule.workDate = :date', { date: query.date });
    } else if (query.from && query.to) {
      qb.andWhere('schedule.workDate BETWEEN :from AND :to', {
        from: query.from,
        to: query.to,
      });
    } else if (query.from) {
      qb.andWhere('schedule.workDate >= :from', { from: query.from });
    } else {
      // Mặc định: tra cứu từ hôm nay trở đi trong 7 ngày tới
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      qb.andWhere('schedule.workDate BETWEEN :today AND :nextWeek', { today, nextWeek });
    }

    qb.orderBy('schedule.workDate', 'ASC').addOrderBy('schedule.startTime', 'ASC');

    const schedules = await qb.getMany();

    return schedules.map((s) => ({
      id: s.id,
      workDate: s.workDate,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      roomNumber: s.roomNumber || doctor.roomNumber,
      maxPatients: s.maxPatients,
      bookedPatients: s.bookedPatients,
      remainingSlots: s.maxPatients - s.bookedPatients,
      doctor: {
        id: doctor.id,
        fullName: doctor.user?.fullName,
        specialty: doctor.specialty,
        consultationFee: doctor.consultationFee,
        roomNumber: doctor.roomNumber,
      },
    }));
  }

  /**
   * Lấy toàn bộ lịch làm việc của bác sĩ
   */
  async getDoctorSchedules(doctorId: string, query: { from?: string; to?: string }) {
    const qb = this.scheduleRepo
      .createQueryBuilder('schedule')
      .where('schedule.doctorId = :doctorId', { doctorId });

    if (query.from && query.to) {
      qb.andWhere('schedule.workDate BETWEEN :from AND :to', {
        from: query.from,
        to: query.to,
      });
    }

    qb.orderBy('schedule.workDate', 'ASC').addOrderBy('schedule.startTime', 'ASC');
    return qb.getMany();
  }

  /**
   * Hủy / Xóa slot làm việc
   */
  async deleteSchedule(scheduleId: string, currentUser?: User): Promise<void> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id: scheduleId },
      relations: ['doctor'],
    });

    if (!schedule) {
      throw new NotFoundError('Khung giờ làm việc không tồn tại');
    }

    if (
      currentUser &&
      currentUser.role === UserRole.DOCTOR &&
      schedule.doctor?.userId !== currentUser.id
    ) {
      throw new ForbiddenError('Bác sĩ chỉ có quyền hủy lịch của chính mình');
    }

    if (schedule.bookedPatients > 0) {
      throw new BadRequestError(
        `Không thể hủy khung giờ này vì đã có ${schedule.bookedPatients} bệnh nhân đặt khám`,
      );
    }

    await this.scheduleRepo.delete(scheduleId);
  }

  // ============================================================
  // 3. PRIVATE VALIDATION & HELPER METHODS
  // ============================================================

  /**
   * Kiểm tra trùng khung giờ:
   * 1. Cùng 1 bác sĩ không được có 2 khung giờ giao nhau cùng ngày.
   * 2. Cùng 1 phòng khám không được có 2 bác sĩ cùng sử dụng trong khung giờ giao nhau cùng ngày.
   */
  private async validateNoOverlap(params: {
    doctorId: string;
    workDate: string;
    startTime: string;
    endTime: string;
    roomNumber: string;
    excludeScheduleId?: string;
  }): Promise<void> {
    const { doctorId, workDate, startTime, endTime, roomNumber, excludeScheduleId } = params;

    // 1. Kiểm tra trùng lịch cùng Bác sĩ: (newStart < existingEnd AND newEnd > existingStart)
    const doctorConflictQb = this.scheduleRepo
      .createQueryBuilder('s')
      .where('s.doctorId = :doctorId', { doctorId })
      .andWhere('s.workDate = :workDate', { workDate })
      .andWhere('s.isAvailable = true')
      .andWhere('s.startTime < :endTime', { endTime })
      .andWhere('s.endTime > :startTime', { startTime });

    if (excludeScheduleId) {
      doctorConflictQb.andWhere('s.id != :excludeScheduleId', { excludeScheduleId });
    }

    const doctorConflict = await doctorConflictQb.getOne();
    if (doctorConflict) {
      throw new ConflictError(
        `Bác sĩ đã có lịch làm việc trong khung giờ ${doctorConflict.startTime} - ${doctorConflict.endTime} ngày ${workDate}`,
      );
    }

    // 2. Kiểm tra trùng lịch cùng Phòng khám:
    if (roomNumber) {
      const roomConflictQb = this.scheduleRepo
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.doctor', 'doctor')
        .leftJoinAndSelect('doctor.user', 'user')
        .where('s.roomNumber = :roomNumber', { roomNumber })
        .andWhere('s.workDate = :workDate', { workDate })
        .andWhere('s.isAvailable = true')
        .andWhere('s.startTime < :endTime', { endTime })
        .andWhere('s.endTime > :startTime', { startTime });

      if (excludeScheduleId) {
        roomConflictQb.andWhere('s.id != :excludeScheduleId', { excludeScheduleId });
      }

      const roomConflict = await roomConflictQb.getOne();
      if (roomConflict && roomConflict.doctorId !== doctorId) {
        const doctorName = roomConflict.doctor?.user?.fullName || 'bác sĩ khác';
        throw new ConflictError(
          `Phòng khám "${roomNumber}" đã được đăng ký bởi ${doctorName} trong khung giờ ${roomConflict.startTime} - ${roomConflict.endTime} ngày ${workDate}`,
        );
      }
    }
  }

  /**
   * Tự động chia ca làm việc thành các slot nhỏ liền kề
   */
  private generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDurationMinutes: number,
  ): Array<{ startTime: string; endTime: string }> {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const slots: Array<{ startTime: string; endTime: string }> = [];

    for (
      let cur = startMinutes;
      cur + slotDurationMinutes <= endMinutes;
      cur += slotDurationMinutes
    ) {
      slots.push({
        startTime: this.minutesToTime(cur),
        endTime: this.minutesToTime(cur + slotDurationMinutes),
      });
    }

    return slots;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private calculateDayOfWeek(dateStr: string): DayOfWeek {
    const day = new Date(dateStr).getDay();
    const map = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return map[day];
  }
}
