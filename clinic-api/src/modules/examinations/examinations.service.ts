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
import { AppDataSource } from '../../config/database';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { Doctor } from '../../models/Doctor.entity';
import { User, UserRole } from '../../models/User.entity';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../exceptions/AppError';
import type {
  SaveDraftExaminationDto,
  CompleteExaminationDto,
} from './examinations.dto';

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
    const doctor = await this.getDoctorProfile(currentUser);
    const targetDate = dateStr || new Date().toISOString().slice(0, 10);

    const appointments = await this.appointmentRepo.find({
      where: {
        doctorId: doctor.id,
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
        id: doctor.id,
        fullName: doctor.user?.fullName,
        specialty: doctor.specialty,
        roomNumber: doctor.roomNumber,
      },
      total: appointments.length,
      currentInProgress: appointments.find((a) => a.status === AppointmentStatus.IN_PROGRESS) || null,
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
  async startExamination(idOrAppointmentId: string, currentUser: User): Promise<Examination> {
    const doctor = await this.getDoctorProfile(currentUser);

    return await AppDataSource.transaction(async (manager) => {
      // Tìm theo ID examination hoặc ID appointment
      let examination = await manager.getRepository(Examination).findOne({
        where: [{ id: idOrAppointmentId }, { appointmentId: idOrAppointmentId }],
        relations: ['appointment', 'patient', 'doctor'],
      });

      // Nếu chưa có examination nhưng có appointment hợp lệ
      if (!examination) {
        const appt = await manager.getRepository(Appointment).findOne({
          where: { id: idOrAppointmentId },
          relations: ['patient', 'doctor'],
        });

        if (!appt) {
          throw new NotFoundError('Không tìm thấy phiếu khám hoặc lịch hẹn');
        }

        examination = manager.getRepository(Examination).create({
          appointmentId: appt.id,
          patientId: appt.patientId,
          doctorId: appt.doctorId,
          status: ExaminationStatus.WAITING,
          chiefComplaintDetail: appt.chiefComplaint,
        });
        examination = await manager.getRepository(Examination).save(examination);
        examination.appointment = appt;
      }

      // Kiểm tra quyền: Chỉ bác sĩ phụ trách hoặc Admin được thao tác
      if (
        currentUser.role === UserRole.DOCTOR &&
        examination.doctorId &&
        examination.doctorId !== doctor.id
      ) {
        throw new ForbiddenError('Bạn không phải bác sĩ phụ trách ca khám này');
      }

      // Cập nhật trạng thái Examination
      examination.status = ExaminationStatus.IN_PROGRESS;
      examination.doctorId = doctor.id;
      const savedExam = await manager.getRepository(Examination).save(examination);

      // Cập nhật trạng thái Appointment tương ứng
      if (examination.appointmentId) {
        const appointment = await manager
          .getRepository(Appointment)
          .findOne({ where: { id: examination.appointmentId } });

        if (appointment) {
          appointment.status = AppointmentStatus.IN_PROGRESS;
          await manager.getRepository(Appointment).save(appointment);
        }
      }

      return (await manager.getRepository(Examination).findOne({
        where: { id: savedExam.id },
        relations: ['appointment', 'patient', 'doctor'],
      })) as Examination;
    });
  }

  /**
   * 3. Cơ chế Lưu nháp (Auto-save draft)
   * Lưu nhanh các chỉ số sinh tồn và nội dung lâm sàng khi bác sĩ đang gõ
   */
  async saveDraft(
    idOrAppointmentId: string,
    dto: SaveDraftExaminationDto,
    currentUser: User,
  ): Promise<Examination> {
    const doctor = await this.getDoctorProfile(currentUser);

    return await AppDataSource.transaction(async (manager) => {
      let examination = await manager.getRepository(Examination).findOne({
        where: [{ id: idOrAppointmentId }, { appointmentId: idOrAppointmentId }],
        relations: ['appointment'],
      });

      if (!examination) {
        throw new NotFoundError('Phiếu khám không tồn tại');
      }

      if (
        currentUser.role === UserRole.DOCTOR &&
        examination.doctorId &&
        examination.doctorId !== doctor.id
      ) {
        throw new ForbiddenError('Bạn không phải bác sĩ phụ trách ca khám này');
      }

      // Không cho phép lưu nháp nếu hồ sơ đã bị khóa sau khi hoàn tất khám
      if (examination.isLocked || examination.status === ExaminationStatus.COMPLETED) {
        throw new BadRequestError(
          'Hồ sơ khám bệnh này đã hoàn tất và bị khóa. Không thể sửa đổi bản nháp.',
        );
      }

      // Tính BMI nếu có thông tin cân nặng & chiều cao
      const targetWeight = dto.weight !== undefined ? dto.weight : examination.weight;
      const targetHeight = dto.height !== undefined ? dto.height : examination.height;
      const calculatedBmi = this.calculateBMI(targetWeight, targetHeight);

      // Cập nhật thông tin sinh hiệu & lâm sàng
      if (dto.weight !== undefined) examination.weight = dto.weight;
      if (dto.height !== undefined) examination.height = dto.height;
      if (calculatedBmi !== undefined) examination.bmi = calculatedBmi;
      if (dto.bloodPressure !== undefined) examination.bloodPressure = dto.bloodPressure;
      if (dto.heartRate !== undefined) examination.heartRate = dto.heartRate;
      if (dto.temperature !== undefined) examination.temperature = dto.temperature;
      if (dto.spo2 !== undefined) examination.spo2 = dto.spo2;
      if (dto.respiratoryRate !== undefined) examination.respiratoryRate = dto.respiratoryRate;

      if (dto.chiefComplaintDetail !== undefined) examination.chiefComplaintDetail = dto.chiefComplaintDetail;
      if (dto.medicalHistory !== undefined) examination.medicalHistory = dto.medicalHistory;
      if (dto.preliminaryDiagnosis !== undefined) examination.preliminaryDiagnosis = dto.preliminaryDiagnosis;
      if (dto.diagnosis !== undefined) examination.diagnosis = dto.diagnosis;
      if (dto.icd10Code !== undefined) examination.icd10Code = dto.icd10Code;
      if (dto.icd10Description !== undefined) examination.icd10Description = dto.icd10Description;
      if (dto.clinicalNotes !== undefined) examination.clinicalNotes = dto.clinicalNotes;
      if (dto.treatmentPlan !== undefined) examination.treatmentPlan = dto.treatmentPlan;
      if (dto.followUpDate !== undefined) examination.followUpDate = new Date(dto.followUpDate);
      if (dto.followUpNotes !== undefined) examination.followUpNotes = dto.followUpNotes;

      // Đánh dấu bản nháp & duy trì trạng thái IN_PROGRESS
      examination.isDraft = true;
      if (examination.status === ExaminationStatus.WAITING) {
        examination.status = ExaminationStatus.IN_PROGRESS;
      }

      const saved = await manager.getRepository(Examination).save(examination);

      // Đồng bộ Appointment sang IN_PROGRESS nếu chưa
      if (examination.appointmentId) {
        await manager.getRepository(Appointment).update(
          { id: examination.appointmentId, status: AppointmentStatus.CHECKED_IN },
          { status: AppointmentStatus.IN_PROGRESS },
        );
      }

      return (await manager.getRepository(Examination).findOne({
        where: { id: saved.id },
        relations: ['appointment', 'patient', 'doctor'],
      })) as Examination;
    });
  }

  /**
   * 4. Hoàn tất khám bệnh (Complete Examination)
   */
  async completeExamination(
    idOrAppointmentId: string,
    dto: CompleteExaminationDto,
    currentUser: User,
  ): Promise<Examination> {
    const doctor = await this.getDoctorProfile(currentUser);

    return await AppDataSource.transaction(async (manager) => {
      const examination = await manager.getRepository(Examination).findOne({
        where: [{ id: idOrAppointmentId }, { appointmentId: idOrAppointmentId }],
        relations: ['appointment'],
      });

      if (!examination) {
        throw new NotFoundError('Phiếu khám không tồn tại');
      }

      if (
        currentUser.role === UserRole.DOCTOR &&
        examination.doctorId &&
        examination.doctorId !== doctor.id
      ) {
        throw new ForbiddenError('Bạn không phải bác sĩ phụ trách ca khám này');
      }

      // Tính BMI
      const targetWeight = dto.weight !== undefined ? dto.weight : examination.weight;
      const targetHeight = dto.height !== undefined ? dto.height : examination.height;
      const calculatedBmi = this.calculateBMI(targetWeight, targetHeight);

      // Cập nhật thông tin
      if (dto.weight !== undefined) examination.weight = dto.weight;
      if (dto.height !== undefined) examination.height = dto.height;
      if (calculatedBmi !== undefined) examination.bmi = calculatedBmi;
      if (dto.bloodPressure !== undefined) examination.bloodPressure = dto.bloodPressure;
      if (dto.heartRate !== undefined) examination.heartRate = dto.heartRate;
      if (dto.temperature !== undefined) examination.temperature = dto.temperature;
      if (dto.spo2 !== undefined) examination.spo2 = dto.spo2;
      if (dto.respiratoryRate !== undefined) examination.respiratoryRate = dto.respiratoryRate;

      if (dto.chiefComplaintDetail !== undefined) examination.chiefComplaintDetail = dto.chiefComplaintDetail;
      if (dto.medicalHistory !== undefined) examination.medicalHistory = dto.medicalHistory;
      if (dto.preliminaryDiagnosis !== undefined) examination.preliminaryDiagnosis = dto.preliminaryDiagnosis;
      examination.diagnosis = dto.diagnosis;
      if (dto.icd10Code !== undefined) examination.icd10Code = dto.icd10Code;
      if (dto.icd10Description !== undefined) examination.icd10Description = dto.icd10Description;
      if (dto.clinicalNotes !== undefined) examination.clinicalNotes = dto.clinicalNotes;
      if (dto.treatmentPlan !== undefined) examination.treatmentPlan = dto.treatmentPlan;
      if (dto.followUpDate !== undefined) examination.followUpDate = new Date(dto.followUpDate);
      if (dto.followUpNotes !== undefined) examination.followUpNotes = dto.followUpNotes;

      // Kiểm tra hồ sơ đã khóa chưa
      if (examination.isLocked || examination.status === ExaminationStatus.COMPLETED) {
        throw new BadRequestError(
          'Hồ sơ khám bệnh đã hoàn tất và bị khóa. Không thể sửa đổi tùy tiện.',
        );
      }

      // Đánh dấu hoàn thành & khóa hồ sơ
      examination.status = ExaminationStatus.COMPLETED;
      examination.isDraft = false;
      examination.isLocked = true;
      examination.completedAt = new Date();

      const saved = await manager.getRepository(Examination).save(examination);

      // Cập nhật Appointment sang COMPLETED
      if (examination.appointmentId) {
        await manager.getRepository(Appointment).update(
          { id: examination.appointmentId },
          { status: AppointmentStatus.COMPLETED },
        );
      }

      return (await manager.getRepository(Examination).findOne({
        where: { id: saved.id },
        relations: ['appointment', 'patient', 'doctor'],
      })) as Examination;
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
