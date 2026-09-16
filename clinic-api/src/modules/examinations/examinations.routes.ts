/**
 * @file src/modules/examinations/examinations.routes.ts
 * @description Router cho Examinations module (EMR - Electronic Medical Record)
 *
 * Quy trình: Bác sĩ mở form → nhập sinh hiệu, chẩn đoán, đơn thuốc → lưu
 * Kết quả sẽ được dùng để tạo hóa đơn (Billing)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../config/database';
import { Examination, ExaminationStatus } from '../../models/Examination.entity';
import { Appointment, AppointmentStatus } from '../../models/Appointment.entity';
import { ApiResponse } from '../../utils/ApiResponse';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { NotFoundError, BadRequestError } from '../../exceptions/AppError';
import { UserRole } from '../../models/User.entity';

const router = Router();
const examRepo = AppDataSource.getRepository(Examination);
const appointmentRepo = AppDataSource.getRepository(Appointment);

// Tất cả routes cần đăng nhập
router.use(authMiddleware);

// Schema tạo/cập nhật kết quả khám
const examinationSchema = z.object({
  appointmentId: z.string().uuid(),
  // Sinh hiệu
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bloodPressure: z.string().optional(),
  heartRate: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  spo2: z.number().min(0).max(100).optional(),
  // Chẩn đoán
  icd10Code: z.string().optional(),
  diagnosis: z.string().min(5, 'Chẩn đoán ít nhất 5 ký tự'),
  clinicalNotes: z.string().optional(),
  // Đơn thuốc
  prescription: z
    .array(
      z.object({
        name: z.string(),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        instruction: z.string(),
      }),
    )
    .optional(),
  // Xét nghiệm
  labTests: z
    .array(
      z.object({
        testName: z.string(),
        testCode: z.string(),
        notes: z.string().optional().default(''),
      }),
    )
    .optional(),
  followUpDate: z.string().optional(),
  followUpNotes: z.string().optional(),
});

// POST /examinations - Bác sĩ nhập kết quả khám
router.post(
  '/',
  roleGuard(UserRole.DOCTOR),
  validate(examinationSchema),
  async (req: Request, res: Response) => {
    const body = req.body;

    // Kiểm tra appointment tồn tại và đang ở trạng thái CHECKED_IN hoặc IN_PROGRESS
    const appointment = await appointmentRepo.findOne({ where: { id: body.appointmentId } });
    if (!appointment) throw new NotFoundError('Lịch hẹn');

    if (
      appointment.status !== AppointmentStatus.IN_PROGRESS &&
      appointment.status !== AppointmentStatus.CHECKED_IN
    ) {
      throw new BadRequestError(
        'Chỉ có thể nhập kết quả khi lịch hẹn đang ở trạng thái "Đã check-in" hoặc "Đang khám"',
      );
    }

    // Tính BMI tự động nếu có cân nặng và chiều cao
    let bmi: number | undefined;
    if (body.weight && body.height) {
      const heightM = body.height / 100; // cm → m
      bmi = Math.round((body.weight / (heightM * heightM)) * 100) / 100;
    }

    // Nếu bản ghi Examination đã được khởi tạo lúc lễ tân check-in, cập nhật lại
    let examination = await examRepo.findOne({ where: { appointmentId: body.appointmentId } });
    if (!examination) {
      examination = examRepo.create({
        ...body,
        bmi,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        status: ExaminationStatus.COMPLETED,
      } as Partial<Examination>);
    } else {
      Object.assign(examination, body, {
        bmi,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        status: ExaminationStatus.COMPLETED,
      });
    }

    const saved = await examRepo.save(examination);

    // Cập nhật trạng thái appointment → COMPLETED
    appointment.status = AppointmentStatus.COMPLETED;
    await appointmentRepo.save(appointment);

    ApiResponse.created(res, saved, 'Lưu kết quả khám thành công');
  },
);

// GET /examinations/:id - Chi tiết kết quả khám
router.get('/:id', async (req: Request, res: Response) => {
  const exam = await examRepo.findOne({
    where: { id: req.params.id },
    relations: [
      'appointment',
      'appointment.patient',
      'appointment.patient.user',
      'appointment.doctor',
      'appointment.doctor.user',
    ],
  });

  if (!exam) throw new NotFoundError('Kết quả khám');
  ApiResponse.success(res, exam, 'Thành công');
});

// GET /examinations/appointment/:appointmentId - Kết quả khám theo lịch hẹn
router.get('/appointment/:appointmentId', async (req: Request, res: Response) => {
  const exam = await examRepo.findOne({
    where: { appointmentId: req.params.appointmentId },
    relations: ['appointment'],
  });

  if (!exam) throw new NotFoundError('Kết quả khám');
  ApiResponse.success(res, exam, 'Thành công');
});

export default router;
