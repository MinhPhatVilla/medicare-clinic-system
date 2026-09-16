/**
 * @file src/modules/examinations/examinations.routes.ts
 * @description Express Router cho module Bác sĩ khám bệnh & MedicalRecords (EMR)
 */

import { Router } from 'express';
import { ExaminationsController } from './examinations.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  saveDraftExaminationSchema,
  completeExaminationSchema,
  waitingQueueQuerySchema,
} from './examinations.dto';
import { UserRole } from '../../models/User.entity';

const router = Router();
const controller = new ExaminationsController();

// Tất cả endpoints cần đăng nhập
router.use(authMiddleware);

// GET /examinations/queue - Lấy danh sách hàng đợi bệnh nhân đang chờ khám của bác sĩ (đặt trước /:id)
router.get(
  '/queue',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(waitingQueueQuerySchema, 'query'),
  (req, res) => controller.getWaitingQueue(req, res),
);

// GET /examinations/appointment/:appointmentId - Kết quả khám theo lịch hẹn (đặt trước /:id)
router.get('/appointment/:appointmentId', (req, res) =>
  controller.findByAppointmentId(req, res),
);

// POST /examinations/:id/start - Bác sĩ bấm "Bắt đầu khám"
router.post(
  '/:id/start',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  (req, res) => controller.startExamination(req, res),
);

// PATCH /examinations/:id/draft - Cơ chế Lưu nháp tức thời (Auto-save draft)
router.patch(
  '/:id/draft',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(saveDraftExaminationSchema),
  (req, res) => controller.saveDraft(req, res),
);

// POST /examinations/:id/complete - Hoàn tất kết quả khám bệnh
router.post(
  '/:id/complete',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(completeExaminationSchema),
  (req, res) => controller.completeExamination(req, res),
);

// GET /examinations/:id - Chi tiết kết quả khám
router.get('/:id', (req, res) => controller.findById(req, res));

export default router;
