/**
 * @file src/modules/reception/reception.service.ts
 * @description Business logic cho module Lễ tân tiếp đón (Receptionist Intake)
 *
 * Nghiệp vụ chính:
 * 1. Tìm kiếm lịch hẹn trong ngày bằng Mã đặt lịch / Số điện thoại.
 * 2. Check-in:
 *    - Cập nhật trạng thái Appointment sang CHECKED_IN.
 *    - Tự động cấp Số Thứ Tự (STT / priorityNumber) trong ngày theo phòng/bác sĩ.
 *    - Khởi tạo bản ghi MedicalRecord (Examination) gắn với bệnh nhân và bác sĩ với trạng thái WAITING.
 * 3. Tiếp nhận bệnh nhân vãng lai (Walk-in):
 *    - Tạo nhanh hồ sơ bệnh nhân (hoặc tái sử dụng hồ sơ cũ).
 *    - Cấp STT, tạo Appointment (WALK_IN, CHECKED_IN) và MedicalRecord (WAITING).
 * 4. Theo dõi hàng đợi khám bệnh của Bác sĩ theo ngày.
 */

import { In } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Appointment, AppointmentStatus, AppointmentType } from '../../models/Appointment.entity';
import { Patient, Gender } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { User } from '../../models/User.entity';
import { BadRequestError, NotFoundError } from '../../exceptions/AppError';
import { paginate, PaginatedResult } from '../../utils/pagination';
import type {
  SearchTodayAppointmentsDto,
  CheckInDto,
  WalkInPatientDto,
  DoctorQueueQueryDto,
  CheckInResult,
  WalkInResult,
  DoctorQueueResult,
} from './reception.dto';

export class ReceptionService {
  private appointmentRepo = AppDataSource.getRepository(Appointment);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);
  private examRepo = AppDataSource.getRepository(Examination);

  /**
   * Helper: Lấy chuỗi ngày hiện tại (YYYY-MM-DD)
   */
  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Lấy chuỗi giờ hiện tại (HH:mm)
   */
  private getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * 1. API tìm kiếm lịch hẹn trong ngày bằng Mã đặt lịch / SĐT
   */
  async searchTodayAppointments(
    query: SearchTodayAppointmentsDto,
  ): Promise<PaginatedResult<Appointment>> {
    const targetDate = query.date || this.getTodayString();
    const rawSearch = query.query.trim();

    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .leftJoinAndSelect('appointment.schedule', 'schedule')
      .leftJoinAndSelect('appointment.examination', 'examination')
      .where('appointment.appointmentDate = :targetDate', { targetDate })
      .andWhere(
        '(appointment.bookingCode ILIKE :search OR patient.phone ILIKE :search OR patient.idCardNumber ILIKE :search OR patientUser.phone ILIKE :search OR patientUser.fullName ILIKE :search)',
        { search: `%${rawSearch}%` },
      );

    if (query.doctorId) {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }

    qb.orderBy('appointment.priorityNumber', 'ASC', 'NULLS LAST').addOrderBy(
      'appointment.appointmentTime',
      'ASC',
    );

    return paginate(qb, { page: query.page, limit: query.limit });
  }

  /**
   * 2. API Check-in:
   * - Cập nhật trạng thái Appointment sang CHECKED_IN.
   * - Tự động cấp Số Thứ Tự (STT) khám bệnh trong ngày theo phòng/bác sĩ.
   * - Khởi tạo bản ghi MedicalRecord (Examination) gắn với bệnh nhân và bác sĩ với trạng thái WAITING.
   */
  async checkIn(dto: CheckInDto, _currentUser: User): Promise<CheckInResult> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Tìm và khóa lịch hẹn
      const qb = manager
        .getRepository(Appointment)
        .createQueryBuilder('appt')
        .setLock('pessimistic_write')
        .leftJoinAndSelect('appt.patient', 'patient')
        .leftJoinAndSelect('patient.user', 'patientUser')
        .leftJoinAndSelect('appt.doctor', 'doctor')
        .leftJoinAndSelect('doctor.user', 'doctorUser')
        .leftJoinAndSelect('appt.schedule', 'schedule');

      if (dto.appointmentId) {
        qb.where('appt.id = :id', { id: dto.appointmentId });
      } else if (dto.bookingCode) {
        qb.where('appt.bookingCode = :code', { code: dto.bookingCode.trim() });
      }

      const appointment = await qb.getOne();

      if (!appointment) {
        throw new NotFoundError('Không tìm thấy lịch hẹn phù hợp để check-in');
      }

      // 2. Kiểm tra trạng thái lịch hẹn
      if (appointment.status === AppointmentStatus.CHECKED_IN) {
        // Đã check-in trước đó: Tìm MedicalRecord hiện có và trả về
        const existingExam = await manager
          .getRepository(Examination)
          .findOne({ where: { appointmentId: appointment.id } });

        return {
          message: 'Bệnh nhân đã check-in trước đó',
          appointment,
          medicalRecord: existingExam,
          priorityNumber: appointment.priorityNumber,
          alreadyCheckedIn: true,
        };
      }

      if (appointment.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestError('Lịch hẹn này đã bị hủy, không thể check-in');
      }

      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new BadRequestError('Lịch hẹn này đã hoàn tất khám bệnh');
      }

      // 3. Tự động tính Số Thứ Tự (STT / priorityNumber) trong ngày theo Bác sĩ
      // Query MAX(priorityNumber) của bác sĩ này trong ngày hôm đó
      const maxSttRow = await manager
        .getRepository(Appointment)
        .createQueryBuilder('a')
        .select('MAX(a.priorityNumber)', 'maxStt')
        .where('a.doctorId = :doctorId', { doctorId: appointment.doctorId })
        .andWhere('a.appointmentDate = :apptDate', { apptDate: appointment.appointmentDate })
        .andWhere('a.priorityNumber IS NOT NULL')
        .getRawOne();

      const nextSTT = (Number(maxSttRow?.maxStt) || 0) + 1;

      // 4. Cập nhật Appointment
      appointment.priorityNumber = nextSTT;
      appointment.status = AppointmentStatus.CHECKED_IN;
      appointment.checkInTime = new Date();

      await manager.getRepository(Appointment).save(appointment);

      // 5. Khởi tạo / Đồng bộ bản ghi MedicalRecord (Examination) với trạng thái WAITING
      let medicalRecord = await manager
        .getRepository(Examination)
        .findOne({ where: { appointmentId: appointment.id } });

      if (!medicalRecord) {
        medicalRecord = manager.getRepository(Examination).create({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          status: ExaminationStatus.WAITING,
          chiefComplaintDetail: appointment.chiefComplaint,
        });
      } else {
        medicalRecord.status = ExaminationStatus.WAITING;
        medicalRecord.patientId = appointment.patientId;
        medicalRecord.doctorId = appointment.doctorId;
        if (!medicalRecord.chiefComplaintDetail) {
          medicalRecord.chiefComplaintDetail = appointment.chiefComplaint;
        }
      }

      const savedExam = await manager.getRepository(Examination).save(medicalRecord);

      return {
        message: 'Check-in thành công. Đã cấp số thứ tự khám bệnh.',
        appointment,
        medicalRecord: savedExam,
        priorityNumber: nextSTT,
        alreadyCheckedIn: false,
      };
    });
  }

  /**
   * 3. Cho phép Lễ tân tạo nhanh lượt khám vãng lai (Walk-in patient) không đặt trước:
   * - Tạo nhanh hồ sơ bệnh nhân (hoặc lấy từ bệnh nhân đã có).
   * - Tạo Appointment (WALK_IN, CHECKED_IN).
   * - Cấp Số Thứ Tự (STT) tự động.
   * - Khởi tạo MedicalRecord với trạng thái WAITING.
   */
  async createWalkIn(dto: WalkInPatientDto, _currentUser: User): Promise<WalkInResult> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Kiểm tra Bác sĩ phụ trách
      const doctor = await manager.getRepository(Doctor).findOne({
        where: { id: dto.doctorId, isAvailable: true },
        relations: ['user'],
      });

      if (!doctor) {
        throw new NotFoundError('Bác sĩ không tồn tại hoặc hiện không tiếp nhận khám');
      }

      // 2. Xác định hoặc tạo mới hồ sơ bệnh nhân (Patient)
      let patient: Patient | null = null;

      if (dto.patientId) {
        patient = await manager.getRepository(Patient).findOne({
          where: { id: dto.patientId },
          relations: ['user'],
        });
        if (!patient) {
          throw new NotFoundError('Hồ sơ bệnh nhân không tồn tại');
        }
      } else if (dto.phone) {
        // Kiểm tra xem số điện thoại này đã có hồ sơ chưa để tái sử dụng
        patient = await manager.getRepository(Patient).findOne({
          where: { phone: dto.phone },
          relations: ['user'],
        });

        if (!patient) {
          // Tạo mới hồ sơ bệnh nhân vãng lai
          const rand = Math.floor(Math.random() * 9000) + 1000;
          const patientCode = `BN-${this.getTodayString().replace(/-/g, '')}-${rand}`;

          patient = manager.getRepository(Patient).create({
            patientCode,
            fullName: dto.fullName!,
            phone: dto.phone,
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
            gender: dto.gender || Gender.MALE,
            idCardNumber: dto.idCardNumber,
            address: dto.address,
            medicalHistory: dto.medicalHistory,
          });

          patient = await manager.getRepository(Patient).save(patient);
        }
      }

      if (!patient) {
        throw new BadRequestError('Không thể xác định thông tin bệnh nhân');
      }

      const todayStr = this.getTodayString();
      const currentTimeStr = this.getCurrentTimeString();

      // 3. Tính Số Thứ Tự (STT / priorityNumber) trong ngày theo Bác sĩ
      const maxSttRow = await manager
        .getRepository(Appointment)
        .createQueryBuilder('a')
        .select('MAX(a.priorityNumber)', 'maxStt')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.appointmentDate = :today', { today: todayStr })
        .andWhere('a.priorityNumber IS NOT NULL')
        .getRawOne();

      const nextSTT = (Number(maxSttRow?.maxStt) || 0) + 1;

      // 4. Sinh mã phiếu khám (bookingCode)
      const dateNoHyphen = todayStr.replace(/-/g, '');
      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const bookingCode = `PKB-${dateNoHyphen}-W${nextSTT}-${randSuffix}`;

      // 5. Tạo Appointment với trạng thái CHECKED_IN
      const appointment = manager.getRepository(Appointment).create({
        bookingCode,
        patientId: patient.id,
        doctorId: doctor.id,
        appointmentDate: todayStr as unknown as Date,
        appointmentTime: currentTimeStr,
        type: AppointmentType.WALK_IN,
        status: AppointmentStatus.CHECKED_IN,
        priorityNumber: nextSTT,
        checkInTime: new Date(),
        chiefComplaint: dto.chiefComplaint,
        qrCode: JSON.stringify({
          bookingCode,
          patientId: patient.id,
          doctorId: doctor.id,
          type: 'WALK_IN',
          stt: nextSTT,
        }),
      });

      const savedAppointment = await manager.getRepository(Appointment).save(appointment);

      // 6. Khởi tạo bản ghi MedicalRecord (Examination) với trạng thái WAITING
      const medicalRecord = manager.getRepository(Examination).create({
        appointmentId: savedAppointment.id,
        patientId: patient.id,
        doctorId: doctor.id,
        status: ExaminationStatus.WAITING,
        chiefComplaintDetail: dto.chiefComplaint,
      });

      const savedExam = await manager.getRepository(Examination).save(medicalRecord);

      return {
        message: 'Tiếp nhận bệnh nhân vãng lai thành công. Đã cấp phiếu khám và số thứ tự.',
        patient,
        doctor: {
          id: doctor.id,
          fullName: doctor.user?.fullName || 'Bác sĩ',
          specialty: doctor.specialty,
          roomNumber: dto.roomNumber || doctor.roomNumber || 'Phòng khám',
        },
        appointment: savedAppointment,
        medicalRecord: savedExam,
        priorityNumber: nextSTT,
      };
    });
  }

  /**
   * 4. Xem hàng đợi khám bệnh hiện tại của bác sĩ trong ngày
   */
  async getDoctorQueue(doctorId: string, query: DoctorQueueQueryDto): Promise<DoctorQueueResult> {
    const targetDate = query.date || this.getTodayString();

    const doctor = await this.doctorRepo.findOne({
      where: { id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundError('Bác sĩ không tồn tại');
    }

    const appointments = await this.appointmentRepo.find({
      where: {
        doctorId,
        appointmentDate: targetDate as unknown as Date,
        status: In([AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS]),
      },
      relations: ['patient', 'patient.user', 'examination'],
      order: {
        priorityNumber: 'ASC',
        checkInTime: 'ASC',
      },
    });

    return {
      date: targetDate,
      doctor: {
        id: doctor.id,
        fullName: doctor.user?.fullName,
        specialty: doctor.specialty,
        roomNumber: doctor.roomNumber,
      },
      totalWaiting: appointments.filter((a) => a.status === AppointmentStatus.CHECKED_IN).length,
      currentInProgress:
        appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS) || null,
      queue: appointments,
    };
  }
}
