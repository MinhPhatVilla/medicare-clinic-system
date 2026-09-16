/**
 * @file src/modules/appointments/appointments.service.ts
 * @description Business logic cho Appointment module với Transaction chống Race Condition
 *
 * Tính năng chính:
 * 1. Đặt lịch khám (Create):
 *    - Khóa bi quan (Pessimistic Locking `SELECT ... FOR UPDATE`) trên slot DoctorSchedule
 *    - Chống race condition khi 2+ bệnh nhân cùng book 1 slot cuối cùng
 *    - Tự động tăng `booked_patients` (current_booked)
 *    - Trạng thái mặc định: CONFIRMED hoặc PENDING
 * 2. Hủy lịch (Cancel):
 *    - Giải phóng slot: Tự động trừ `booked_patients` trong DoctorSchedule
 *    - Cập nhật trạng thái CANCELLED kèm lý do
 * 3. Dời lịch (Reschedule):
 *    - Transaction an toàn: Trừ slot cũ, kiểm tra & cộng slot mới
 * 4. Xem danh sách lịch hẹn của tôi (getMyAppointments):
 *    - Bệnh nhân xem lịch cá nhân, Bác sĩ xem danh sách khám theo ca
 */

import { In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Appointment, AppointmentStatus, AppointmentType } from '../../models/Appointment.entity';
import { Patient } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { DoctorSchedule } from '../../models/DoctorSchedule.entity';
import { User, UserRole } from '../../models/User.entity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../exceptions/AppError';
import { paginate, PaginatedResult } from '../../utils/pagination';
import type {
  CreateAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
  MyAppointmentsQueryDto,
} from './appointments.dto';

export class AppointmentsService {
  private appointmentRepo = AppDataSource.getRepository(Appointment);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);
  private scheduleRepo = AppDataSource.getRepository(DoctorSchedule);

  /**
   * Helper: Lấy profile bệnh nhân từ user đang đăng nhập
   */
  private async getPatientProfile(currentUser: User): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
    if (!patient) {
      throw new NotFoundError('Hồ sơ bệnh nhân không tồn tại. Vui lòng cập nhật hồ sơ trước.');
    }
    return patient;
  }

  /**
   * Helper: Lấy profile bác sĩ từ user đang đăng nhập
   */
  private async getDoctorProfile(currentUser: User): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId: currentUser.id } });
    if (!doctor) {
      throw new NotFoundError('Hồ sơ bác sĩ không tồn tại.');
    }
    return doctor;
  }

  /**
   * Tạo lịch hẹn mới (Đặt lịch khám)
   * Sử dụng Database Transaction + Pessimistic Lock trên DoctorSchedule để chống Race Condition
   */
  async create(dto: CreateAppointmentDto, currentUser: User): Promise<Appointment> {
    // 1. Xác định bệnh nhân
    let patientId: string;
    if (currentUser.role === UserRole.PATIENT) {
      const patient = await this.getPatientProfile(currentUser);
      patientId = patient.id;
    } else if (currentUser.role === UserRole.RECEPTIONIST || currentUser.role === UserRole.ADMIN) {
      // Tiếp tân / Admin đặt lịch thay: Cần kiểm tra patientId nếu truyền hoặc fallback
      const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
      if (patient) {
        patientId = patient.id;
      } else {
        // Lấy bệnh nhân đầu tiên hoặc yêu cầu truyền
        const anyPatient = await this.patientRepo.findOne({ where: {} });
        if (!anyPatient) throw new NotFoundError('Chưa có hồ sơ bệnh nhân nào trong hệ thống');
        patientId = anyPatient.id;
      }
    } else {
      throw new ForbiddenError('Chỉ bệnh nhân, tiếp tân hoặc admin mới có quyền đặt lịch');
    }

    // 2. Mở Transaction với Pessimistic Lock
    return await AppDataSource.transaction(async (manager) => {
      // 2.1. Kiểm tra bác sĩ
      const doctor = await manager.getRepository(Doctor).findOne({
        where: { id: dto.doctorId, isAvailable: true },
        relations: ['user'],
      });

      if (!doctor) {
        throw new NotFoundError('Bác sĩ không tồn tại hoặc hiện không tiếp nhận khám');
      }

      // 2.2. Tìm và khóa DoctorSchedule row bằng SELECT ... FOR UPDATE
      let schedule: DoctorSchedule | null = null;

      if (dto.scheduleId) {
        schedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.id = :scheduleId', { scheduleId: dto.scheduleId })
          .andWhere('schedule.doctorId = :doctorId', { doctorId: dto.doctorId })
          .getOne();
      } else {
        schedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.doctorId = :doctorId', { doctorId: dto.doctorId })
          .andWhere('schedule.workDate = :workDate', { workDate: dto.appointmentDate })
          .andWhere('schedule.startTime = :startTime', { startTime: dto.appointmentTime })
          .getOne();
      }

      if (!schedule) {
        throw new NotFoundError(
          'Không tìm thấy khung giờ làm việc phù hợp của bác sĩ vào thời gian đã chọn',
        );
      }

      // 2.3. Kiểm tra tính khả dụng & giới hạn bệnh nhân
      if (!schedule.isAvailable) {
        throw new BadRequestError('Khung giờ này hiện đã đóng và không còn nhận bệnh nhân');
      }

      if (schedule.bookedPatients >= schedule.maxPatients) {
        throw new BadRequestError(
          `Khung giờ này đã đầy (${schedule.bookedPatients}/${schedule.maxPatients} bệnh nhân). Vui lòng chọn khung giờ khác.`,
        );
      }

      // 2.4. Chống trùng lịch: Bệnh nhân không được có 2 lịch hẹn còn hiệu lực trong cùng 1 slot
      const existingAppt = await manager.getRepository(Appointment).findOne({
        where: {
          patientId,
          doctorId: dto.doctorId,
          appointmentDate: schedule.workDate,
          appointmentTime: schedule.startTime,
          status: In([
            AppointmentStatus.PENDING,
            AppointmentStatus.CONFIRMED,
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_PROGRESS,
          ]),
        },
      });

      if (existingAppt) {
        throw new BadRequestError('Bạn đã có một lịch hẹn với bác sĩ trong khung giờ này');
      }

      // 2.5. Tăng current_booked (bookedPatients) an toàn bên trong transaction
      schedule.bookedPatients += 1;
      await manager.getRepository(DoctorSchedule).save(schedule);

      // 2.6. Tạo booking code: PKB-YYYYMMDD-XXXX
      const dateStr = String(schedule.workDate).replace(/-/g, '').slice(0, 8);
      const random = Math.random().toString(36).substring(2, 6).toUpperCase();
      const bookingCode = `PKB-${dateStr}-${random}`;

      // 2.7. Tạo dữ liệu QR code cho check-in
      const qrCode = JSON.stringify({
        bookingCode,
        patientId,
        doctorId: dto.doctorId,
        scheduleId: schedule.id,
        date: schedule.workDate,
        time: schedule.startTime,
      });

      // 2.8. Tạo Appointment entity
      const appointment = manager.getRepository(Appointment).create({
        bookingCode,
        patientId,
        doctorId: dto.doctorId,
        scheduleId: schedule.id,
        appointmentDate: schedule.workDate,
        appointmentTime: schedule.startTime,
        chiefComplaint: dto.chiefComplaint,
        type: (dto.type as AppointmentType) || AppointmentType.ONLINE,
        status: (dto.status as AppointmentStatus) || AppointmentStatus.CONFIRMED,
        priorityNumber: schedule.bookedPatients,
        qrCode,
      });

      const savedAppointment = await manager.getRepository(Appointment).save(appointment);

      // Trả về kèm relations đầy đủ
      return (await manager.getRepository(Appointment).findOne({
        where: { id: savedAppointment.id },
        relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'schedule'],
      })) as Appointment;
    });
  }

  /**
   * Hủy lịch hẹn (Cancel)
   * Tự động giảm bookedPatients của DoctorSchedule trong cùng 1 Transaction
   */
  async cancel(id: string, dto: CancelAppointmentDto, currentUser: User): Promise<Appointment> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Khóa và lấy appointment
      const appointment = await manager
        .getRepository(Appointment)
        .createQueryBuilder('appt')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('appt.patient', 'patient')
        .where('appt.id = :id', { id })
        .getOne();

      if (!appointment) {
        throw new NotFoundError('Lịch hẹn không tồn tại');
      }

      // 2. Phân quyền: Bệnh nhân chỉ được hủy lịch của mình
      if (currentUser.role === UserRole.PATIENT) {
        if (appointment.patient.userId !== currentUser.id) {
          throw new ForbiddenError('Bạn không có quyền hủy lịch hẹn này');
        }
      }

      // 3. Kiểm tra trạng thái: Chỉ cho phép hủy khi đang PENDING hoặc CONFIRMED
      const cancelableStatuses = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
      if (!cancelableStatuses.includes(appointment.status)) {
        throw new BadRequestError(`Không thể hủy lịch hẹn đã ở trạng thái "${appointment.status}"`);
      }

      // 4. Giải phóng slot trong DoctorSchedule (nếu có scheduleId)
      if (appointment.scheduleId) {
        const schedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.id = :id', { id: appointment.scheduleId })
          .getOne();

        if (schedule && schedule.bookedPatients > 0) {
          schedule.bookedPatients -= 1;
          await manager.getRepository(DoctorSchedule).save(schedule);
        }
      }

      // 5. Cập nhật trạng thái Appointment
      appointment.status = AppointmentStatus.CANCELLED;
      appointment.cancellationReason = dto.cancellationReason;
      await manager.getRepository(Appointment).save(appointment);

      return (await manager.getRepository(Appointment).findOne({
        where: { id: appointment.id },
        relations: ['patient', 'doctor', 'schedule'],
      })) as Appointment;
    });
  }

  /**
   * Dời lịch khám (Reschedule)
   * Transaction an toàn: Giảm slot cũ, kiểm tra & tăng slot mới
   */
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    currentUser: User,
  ): Promise<Appointment> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Khóa và kiểm tra lịch hẹn
      const appointment = await manager
        .getRepository(Appointment)
        .createQueryBuilder('appt')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('appt.patient', 'patient')
        .where('appt.id = :id', { id })
        .getOne();

      if (!appointment) {
        throw new NotFoundError('Lịch hẹn không tồn tại');
      }

      // Phân quyền
      if (currentUser.role === UserRole.PATIENT) {
        if (appointment.patient.userId !== currentUser.id) {
          throw new ForbiddenError('Bạn không có quyền dời lịch hẹn này');
        }
      }

      // Chỉ cho phép dời lịch khi PENDING hoặc CONFIRMED
      const reschedulableStatuses = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
      if (!reschedulableStatuses.includes(appointment.status)) {
        throw new BadRequestError(
          `Không thể dời lịch hẹn đang ở trạng thái "${appointment.status}"`,
        );
      }

      // 2. Tìm và khóa khung giờ mới (newSchedule)
      let newSchedule: DoctorSchedule | null = null;
      if (dto.newScheduleId) {
        newSchedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.id = :id', { id: dto.newScheduleId })
          .getOne();
      } else if (dto.newDate && dto.newTime) {
        newSchedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.doctorId = :doctorId', { doctorId: appointment.doctorId })
          .andWhere('schedule.workDate = :workDate', { workDate: dto.newDate })
          .andWhere('schedule.startTime = :startTime', { startTime: dto.newTime })
          .getOne();
      }

      if (!newSchedule) {
        throw new NotFoundError('Không tìm thấy khung giờ mới để dời lịch');
      }

      if (appointment.scheduleId === newSchedule.id) {
        throw new BadRequestError('Khung giờ mới trùng với khung giờ hiện tại');
      }

      if (!newSchedule.isAvailable || newSchedule.bookedPatients >= newSchedule.maxPatients) {
        throw new BadRequestError(
          `Khung giờ mới đã đầy (${newSchedule.bookedPatients}/${newSchedule.maxPatients} bệnh nhân). Vui lòng chọn giờ khác.`,
        );
      }

      // 3. Giảm slot ở schedule cũ (nếu có)
      if (appointment.scheduleId) {
        const oldSchedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.id = :id', { id: appointment.scheduleId })
          .getOne();

        if (oldSchedule && oldSchedule.bookedPatients > 0) {
          oldSchedule.bookedPatients -= 1;
          await manager.getRepository(DoctorSchedule).save(oldSchedule);
        }
      }

      // 4. Tăng slot ở schedule mới
      newSchedule.bookedPatients += 1;
      await manager.getRepository(DoctorSchedule).save(newSchedule);

      // 5. Cập nhật appointment
      appointment.scheduleId = newSchedule.id;
      appointment.doctorId = newSchedule.doctorId;
      appointment.appointmentDate = newSchedule.workDate;
      appointment.appointmentTime = newSchedule.startTime;
      appointment.priorityNumber = newSchedule.bookedPatients;

      // Cập nhật lại QR code
      appointment.qrCode = JSON.stringify({
        bookingCode: appointment.bookingCode,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        scheduleId: newSchedule.id,
        date: newSchedule.workDate,
        time: newSchedule.startTime,
      });

      await manager.getRepository(Appointment).save(appointment);

      return (await manager.getRepository(Appointment).findOne({
        where: { id: appointment.id },
        relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'schedule'],
      })) as Appointment;
    });
  }

  /**
   * Xem danh sách lịch hẹn của tôi (Bệnh nhân / Bác sĩ)
   */
  async getMyAppointments(
    query: MyAppointmentsQueryDto,
    currentUser: User,
  ): Promise<PaginatedResult<Appointment>> {
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('appointment.schedule', 'schedule')
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC');

    if (currentUser.role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
      if (!patient) {
        return {
          data: [],
          meta: { total: 0, page: query.page, limit: query.limit, totalPages: 0 },
        };
      }
      qb.andWhere('appointment.patientId = :patientId', { patientId: patient.id });
    } else if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId: currentUser.id } });
      if (!doctor) {
        return {
          data: [],
          meta: { total: 0, page: query.page, limit: query.limit, totalPages: 0 },
        };
      }
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: doctor.id });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('appointment.appointmentDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('appointment.appointmentDate <= :to', { to: query.to });
    }

    return paginate(qb, { page: query.page, limit: query.limit });
  }

  /**
   * Lấy danh sách tất cả lịch hẹn (Admin, Tiếp tân, Bác sĩ có lọc)
   */
  async findAll(
    query: AppointmentQueryDto,
    currentUser: User,
  ): Promise<PaginatedResult<Appointment>> {
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('appointment.schedule', 'schedule')
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC');

    // Phân quyền dữ liệu
    if (currentUser.role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
      if (patient) qb.andWhere('appointment.patientId = :patientId', { patientId: patient.id });
    } else if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId: currentUser.id } });
      if (doctor) qb.andWhere('appointment.doctorId = :doctorId', { doctorId: doctor.id });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }
    if (query.date) {
      qb.andWhere('appointment.appointmentDate = :date', { date: query.date });
    }
    if (query.doctorId) {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: query.doctorId });
    }
    if (query.patientId) {
      qb.andWhere('appointment.patientId = :patientId', { patientId: query.patientId });
    }

    return paginate(qb, { page: query.page, limit: query.limit });
  }

  /**
   * Lấy chi tiết 1 lịch hẹn
   */
  async findOne(id: string, currentUser: User): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: [
        'patient',
        'patient.user',
        'doctor',
        'doctor.user',
        'schedule',
        'examination',
        'invoice',
      ],
    });

    if (!appointment) {
      throw new NotFoundError('Lịch hẹn không tồn tại');
    }

    // Kiểm tra quyền truy cập
    if (currentUser.role === UserRole.PATIENT && appointment.patient?.userId !== currentUser.id) {
      throw new ForbiddenError('Bạn không có quyền xem lịch hẹn này');
    }

    return appointment;
  }

  /**
   * Cập nhật trạng thái lịch hẹn (Tiếp tân/Bác sĩ dùng)
   */
  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Appointment> {
    return await AppDataSource.transaction(async (manager) => {
      const appointment = await manager
        .getRepository(Appointment)
        .createQueryBuilder('appt')
        .setLock('pessimistic_write')
        .where('appt.id = :id', { id })
        .getOne();

      if (!appointment) {
        throw new NotFoundError('Lịch hẹn không tồn tại');
      }

      // Nếu chuyển sang CANCELLED hoặc NO_SHOW từ PENDING/CONFIRMED: giải phóng slot
      const isReleasingSlot =
        ['CANCELLED', 'NO_SHOW'].includes(dto.status) &&
        [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED].includes(appointment.status);

      if (isReleasingSlot && appointment.scheduleId) {
        const schedule = await manager
          .getRepository(DoctorSchedule)
          .createQueryBuilder('schedule')
          .setLock('pessimistic_write')
          .where('schedule.id = :id', { id: appointment.scheduleId })
          .getOne();

        if (schedule && schedule.bookedPatients > 0) {
          schedule.bookedPatients -= 1;
          await manager.getRepository(DoctorSchedule).save(schedule);
        }
      }

      // Xử lý check-in
      if (dto.status === 'CHECKED_IN') {
        appointment.checkInTime = new Date();
      }

      if (dto.cancellationReason) {
        appointment.cancellationReason = dto.cancellationReason;
      }

      if (dto.priorityNumber) {
        appointment.priorityNumber = dto.priorityNumber;
      }

      appointment.status = dto.status as AppointmentStatus;
      await manager.getRepository(Appointment).save(appointment);

      return (await manager.getRepository(Appointment).findOne({
        where: { id: appointment.id },
        relations: ['patient', 'doctor', 'schedule'],
      })) as Appointment;
    });
  }

  /**
   * Check-in bằng QR code (Tiếp tân quét mã)
   */
  async checkInByQR(bookingCode: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { bookingCode },
      relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'schedule'],
    });

    if (!appointment) {
      throw new NotFoundError(`Không tìm thấy lịch hẹn với mã: ${bookingCode}`);
    }

    if (
      appointment.status !== AppointmentStatus.CONFIRMED &&
      appointment.status !== AppointmentStatus.PENDING
    ) {
      throw new BadRequestError(
        `Không thể check-in: Lịch hẹn đang ở trạng thái "${appointment.status}"`,
      );
    }

    appointment.status = AppointmentStatus.CHECKED_IN;
    appointment.checkInTime = new Date();

    return this.appointmentRepo.save(appointment);
  }
}
