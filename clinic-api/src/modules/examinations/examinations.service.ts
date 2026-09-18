/**
 * @file src/modules/examinations/examinations.service.ts
 * @description Business logic cho module Bác sĩ khám bệnh & MedicalRecords (EMR)
 *
 * Nghiệp vụ chính:
 * 1. Lấy danh sách hàng đợi bệnh nhân đang chờ khám (Waiting Queue) của bác sĩ theo ngày.
 * 2. Bắt đầu khám: Chuyển trạng thái phiếu khám và lịch hẹn sang IN_PROGRESS.
 * 3. Lưu nháp (Auto-save draft): Lưu nháp tức thời các chỉ số sinh hiệu và lâm sàng khi đang gõ.
 * 4. Hoàn tất khám: Kết luận chẩn đoán xác định, chuyển sang trạng thái COMPLETED.
 */

import { In } from 'typeorm';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';
import { AppDataSource } from '../../config/database';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { Doctor } from '../../models/Doctor.entity';
import { User, UserRole } from '../../models/User.entity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../exceptions/AppError';
import type { SaveDraftExaminationDto, CompleteExaminationDto } from './examinations.dto';

export class ExaminationsService {
  private examRepo = AppDataSource.getRepository(Examination);
  private appointmentRepo = AppDataSource.getRepository(Appointment);
  private doctorRepo = AppDataSource.getRepository(Doctor);

  /**
   * Helper: Lấy profile Bác sĩ từ user đang đăng nhập
   */
  private async getDoctorProfile(currentUser: User): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({
      where: { userId: currentUser.id },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundError('Hồ sơ bác sĩ không tồn tại');
    }
    return doctor;
  }

  /**
   * Helper: Tính BMI tự động
   */
  private calculateBMI(weight?: number, height?: number): number | undefined {
    if (weight && height && weight > 0 && height > 0) {
      const heightM = height / 100;
      return Math.round((weight / (heightM * heightM)) * 100) / 100;
    }
    return undefined;
  }

  /**
   * 1. Lấy danh sách hàng đợi bệnh nhân đang chờ khám (Waiting Queue) của bác sĩ theo ngày
   */
  async getWaitingQueue(currentUser: User, dateStr?: string) {
    const doctor =
      currentUser.role === UserRole.DOCTOR ? await this.getDoctorProfile(currentUser) : null;
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);

    const appointments = await this.appointmentRepo.find({
      where: {
        ...(doctor ? { doctorId: doctor.id } : {}),
        appointmentDate: targetDate as unknown as Date,
        status: In([AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS]),
      },
      relations: ['patient', 'patient.user', 'examination', 'schedule'],
      order: {
        priorityNumber: 'ASC',
        checkInTime: 'ASC',
      },
    });

    return {
      date: targetDate,
      doctor: {
        id: doctor?.id,
        fullName: doctor?.user?.fullName,
        specialty: doctor?.specialty,
        roomNumber: doctor?.roomNumber,
      },
      total: appointments.length,
      currentInProgress:
        appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS) || null,
      queue: appointments.map((a) => ({
        appointmentId: a.id,
        bookingCode: a.bookingCode,
        priorityNumber: a.priorityNumber,
        status: a.status,
        checkInTime: a.checkInTime,
        appointmentTime: a.appointmentTime,
        chiefComplaint: a.chiefComplaint,
        examinationId: a.examination?.id || null,
        examinationStatus: a.examination?.status || ExaminationStatus.WAITING,
        patient: {
          id: a.patient?.id,
          patientCode: a.patient?.patientCode,
          fullName: a.patient?.fullName || a.patient?.user?.fullName,
          gender: a.patient?.gender,
          dateOfBirth: a.patient?.dateOfBirth,
          phone: a.patient?.phone || a.patient?.user?.phone,
          medicalHistory: a.patient?.medicalHistory,
        },
      })),
    };
  }

  /**
   * 2. Bác sĩ bấm "Bắt đầu khám": Cập nhật trạng thái phiếu khám sang IN_PROGRESS
   */
  async startExamination(id: string, currentUser: User): Promise<Examination> {
    return this.mutateExamination(id, {}, currentUser, 'start');
  }

  async saveDraft(
    id: string,
    dto: SaveDraftExaminationDto,
    currentUser: User,
  ): Promise<Examination> {
    return this.mutateExamination(id, dto, currentUser, 'draft');
  }

  async completeExamination(
    id: string,
    dto: CompleteExaminationDto,
    currentUser: User,
  ): Promise<Examination> {
    return this.mutateExamination(id, dto, currentUser, 'complete');
  }

  private async mutateExamination(
    id: string,
    dto: SaveDraftExaminationDto,
    user: User,
    mode: 'start' | 'draft' | 'complete',
  ): Promise<Examination> {
    return AppDataSource.transaction(async (manager) => {
      const exam = await manager.findOne(Examination, {
        where: [{ id }, { appointmentId: id }],
        lock: { mode: 'pessimistic_write' },
      });
      if (!exam) throw new NotFoundError('Phieu kham');
      const appointment = await manager.findOneByOrFail(Appointment, { id: exam.appointmentId });
      const doctor = await manager.findOneByOrFail(Doctor, {
        id: exam.doctorId || appointment.doctorId,
      });
      if (user.role !== UserRole.ADMIN && doctor.userId !== user.id) throw new ForbiddenError();
      if (
        exam.isLocked ||
        ![ExaminationStatus.WAITING, ExaminationStatus.IN_PROGRESS].includes(exam.status)
      ) {
        throw new BadRequestError('Ho so da dong, khong the sua doi');
      }
      if (
        ![AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS].includes(appointment.status)
      ) {
        throw new BadRequestError('Can check-in truoc khi kham');
      }
      const { followUpDate, ...fields } = dto;
      Object.assign(exam, fields);
      if (followUpDate !== undefined) exam.followUpDate = new Date(followUpDate);
      const bmi = this.calculateBMI(Number(exam.weight), Number(exam.height));
      if (bmi !== undefined) {
        if (bmi > 999.99) throw new BadRequestError('Chi so can nang/chieu cao khong hop le');
        exam.bmi = bmi;
      }
      exam.doctorId = doctor.id;
      exam.status = ExaminationStatus.IN_PROGRESS;
      exam.isDraft = mode === 'draft';
      await manager.save(exam);
      await manager.update(Appointment, appointment.id, { status: AppointmentStatus.IN_PROGRESS });
      if (mode === 'complete') {
        await new PrescriptionsService(manager).completeAndLockExamination(exam.id, {
          diagnosis: dto.diagnosis!,
        });
      }
      return manager.findOneOrFail(Examination, {
        where: { id: exam.id },
        relations: ['appointment', 'patient', 'doctor'],
      });
    });
  }

  /**
   * Lấy chi tiết phiếu khám theo ID
   */
  async findById(id: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { id },
      relations: [
        'appointment',
        'appointment.patient',
        'appointment.doctor',
        'patient',
        'doctor',
        'doctor.user',
        'serviceOrders',
        'prescription',
        'prescription.details',
      ],
    });

    if (!exam) throw new NotFoundError('Phiếu khám không tồn tại');
    return exam;
  }

  /**
   * Lấy chi tiết phiếu khám theo appointmentId
   */
  async findByAppointmentId(appointmentId: string): Promise<Examination> {
    const exam = await this.examRepo.findOne({
      where: { appointmentId },
      relations: [
        'appointment',
        'appointment.patient',
        'appointment.doctor',
        'patient',
        'doctor',
        'doctor.user',
        'serviceOrders',
        'prescription',
        'prescription.details',
      ],
    });

    if (!exam) throw new NotFoundError('Chưa có phiếu khám cho lịch hẹn này');
    return exam;
  }
}
