/**
 * @file src/modules/appointments/appointments.service.ts
 * @description Business logic cho Appointment module
 *
 * Quy trình đặt lịch:
 * Patient đặt → PENDING → Tiếp tân xác nhận → CONFIRMED
 * → Bệnh nhân đến check-in (QR scan) → CHECKED_IN
 * → Bác sĩ gọi khám → IN_PROGRESS
 * → Bác sĩ hoàn thành → COMPLETED
 * → Tiếp tân tạo hóa đơn và thu tiền
 */

import { AppDataSource } from '../../config/database';
import { Appointment, AppointmentStatus, AppointmentType } from '../../models/Appointment.entity';
import { Patient } from '../../models/Patient.entity';
import { Doctor } from '../../models/Doctor.entity';
import { User, UserRole } from '../../models/User.entity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../exceptions/AppError';
import { paginate } from '../../utils/pagination';
import type {
  CreateAppointmentDto,
  UpdateStatusDto,
  AppointmentQueryDto,
} from './appointments.dto';

export class AppointmentsService {
  private appointmentRepo = AppDataSource.getRepository(Appointment);
  private patientRepo = AppDataSource.getRepository(Patient);
  private doctorRepo = AppDataSource.getRepository(Doctor);

  /**
   * Tạo lịch hẹn mới
   * - Chỉ PATIENT được đặt cho bản thân, RECEPTIONIST đặt thay
   * - Kiểm tra bác sĩ tồn tại và còn làm việc
   * - Kiểm tra slot thời gian còn trống
   * - Tự động tạo booking code và QR code data
   */
  async create(dto: CreateAppointmentDto, currentUser: User): Promise<Appointment> {
    // Tìm doctor
    const doctor = await this.doctorRepo.findOne({
      where: { id: dto.doctorId, isAvailable: true },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundError('Bác sĩ');
    }

    // Kiểm tra slot còn trống
    const conflictingAppointment = await this.appointmentRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        appointmentDate: new Date(dto.appointmentDate) as unknown as Date,
        appointmentTime: dto.appointmentTime,
        status: AppointmentStatus.CONFIRMED,
      },
    });

    if (conflictingAppointment) {
      throw new BadRequestError('Khung giờ này đã có bệnh nhân khác đặt. Vui lòng chọn giờ khác.');
    }

    // Tìm patient profile của user hiện tại (nếu là PATIENT)
    let patientId: string;

    if (currentUser.role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
      if (!patient) {
        throw new NotFoundError('Hồ sơ bệnh nhân');
      }
      patientId = patient.id;
    } else if (currentUser.role === UserRole.RECEPTIONIST) {
      // Tiếp tân tạo walk-in appointment — cần có patientId trong body
      // (Đây là simplified version, production cần thêm patientId vào DTO)
      throw new BadRequestError('Tiếp tân vui lòng dùng endpoint walk-in riêng');
    } else {
      throw new ForbiddenError();
    }

    // Tạo booking code: PKB-YYYYMMDD-XXXX
    const dateStr = dto.appointmentDate.replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingCode = `PKB-${dateStr}-${random}`;

    // QR code data (chứa thông tin để scan check-in)
    const qrCode = JSON.stringify({
      bookingCode,
      patientId,
      doctorId: dto.doctorId,
      date: dto.appointmentDate,
      time: dto.appointmentTime,
    });

    const appointment = this.appointmentRepo.create({
      bookingCode,
      patientId,
      doctorId: dto.doctorId,
      appointmentDate: new Date(dto.appointmentDate),
      appointmentTime: dto.appointmentTime,
      chiefComplaint: dto.chiefComplaint,
      type: dto.type as AppointmentType,
      status: AppointmentStatus.PENDING,
      qrCode,
    });

    return this.appointmentRepo.save(appointment);
  }

  /**
   * Lấy danh sách lịch hẹn (có phân trang và filter)
   * - PATIENT chỉ thấy lịch của mình
   * - DOCTOR chỉ thấy lịch của mình
   * - RECEPTIONIST, ADMIN thấy tất cả
   */
  async findAll(query: AppointmentQueryDto, currentUser: User) {
    const qb = this.appointmentRepo
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.patient', 'patient')
      .leftJoinAndSelect('patient.user', 'patientUser')
      .leftJoinAndSelect('appointment.doctor', 'doctor')
      .leftJoinAndSelect('doctor.user', 'doctorUser')
      .orderBy('appointment.appointmentDate', 'DESC')
      .addOrderBy('appointment.appointmentTime', 'ASC');

    // Phân quyền xem dữ liệu
    if (currentUser.role === UserRole.PATIENT) {
      const patient = await this.patientRepo.findOne({ where: { userId: currentUser.id } });
      if (patient) qb.andWhere('appointment.patientId = :patientId', { patientId: patient.id });
    } else if (currentUser.role === UserRole.DOCTOR) {
      const doctor = await this.doctorRepo.findOne({ where: { userId: currentUser.id } });
      if (doctor) qb.andWhere('appointment.doctorId = :doctorId', { doctorId: doctor.id });
    }

    // Filters
    if (query.status) {
      qb.andWhere('appointment.status = :status', { status: query.status });
    }
    if (query.date) {
      qb.andWhere('appointment.appointmentDate = :date', { date: query.date });
    }
    if (query.doctorId) {
      qb.andWhere('appointment.doctorId = :doctorId', { doctorId: query.doctorId });
    }

    return paginate(qb, { page: query.page, limit: query.limit });
  }

  /**
   * Lấy chi tiết 1 lịch hẹn
   */
  async findOne(id: string, _currentUser: User): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'examination', 'invoice'],
    });

    if (!appointment) {
      throw new NotFoundError('Lịch hẹn');
    }

    return appointment;
  }

  /**
   * Cập nhật trạng thái lịch hẹn (Tiếp tân/Bác sĩ dùng)
   */
  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({ where: { id } });

    if (!appointment) {
      throw new NotFoundError('Lịch hẹn');
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
    return this.appointmentRepo.save(appointment);
  }

  /**
   * Check-in bằng QR code (Tiếp tân quét mã)
   */
  async checkInByQR(bookingCode: string): Promise<Appointment> {
    const appointment = await this.appointmentRepo.findOne({
      where: { bookingCode },
      relations: ['patient', 'patient.user', 'doctor', 'doctor.user'],
    });

    if (!appointment) {
      throw new NotFoundError(`Không tìm thấy lịch hẹn với mã: ${bookingCode}`);
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestError(
        `Không thể check-in: Lịch hẹn đang ở trạng thái "${appointment.status}"`,
      );
    }

    appointment.status = AppointmentStatus.CHECKED_IN;
    appointment.checkInTime = new Date();

    return this.appointmentRepo.save(appointment);
  }
}
