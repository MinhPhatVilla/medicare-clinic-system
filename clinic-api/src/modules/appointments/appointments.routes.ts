/**
 * @file src/modules/appointments/appointments.routes.ts
 * @description Express Router cho Appointments module
 */

import { Router } from 'express';
import { AppointmentsController } from './appointments.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createAppointmentSchema,
  updateStatusSchema,
  appointmentQuerySchema,
} from './appointments.dto';
import { UserRole } from '../../models/User.entity';

const router = Router();
const controller = new AppointmentsController();

// Tất cả routes cần đăng nhập
router.use(authMiddleware);

// GET /appointments - Lấy danh sách (tất cả roles)
router.get('/', validate(appointmentQuerySchema, 'query'), (req, res) =>
  controller.findAll(req, res),
);

// GET /appointments/:id - Chi tiết lịch hẹn
router.get('/:id', (req, res) => controller.findOne(req, res));

// POST /appointments - Đặt lịch (Patient, Receptionist)
router.post(
  '/',
  roleGuard(UserRole.PATIENT, UserRole.RECEPTIONIST),
  validate(createAppointmentSchema),
  (req, res) => controller.create(req, res),
);

// PATCH /appointments/:id/status - Cập nhật trạng thái (Receptionist, Doctor, Admin)
router.patch(
  '/:id/status',
  roleGuard(UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.ADMIN),
  validate(updateStatusSchema),
  (req, res) => controller.updateStatus(req, res),
);

// POST /appointments/checkin/:bookingCode - QR Check-in (Receptionist)
router.post('/checkin/:bookingCode', roleGuard(UserRole.RECEPTIONIST), (req, res) =>
  controller.checkInByQR(req, res),
);

export default router;
