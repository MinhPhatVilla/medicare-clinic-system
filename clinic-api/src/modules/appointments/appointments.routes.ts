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
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  updateStatusSchema,
  appointmentQuerySchema,
  myAppointmentsQuerySchema,
} from './appointments.dto';
import { UserRole } from '../../models/User.entity';

const router = Router();
const controller = new AppointmentsController();

// Tất cả endpoints cần xác thực tài khoản JWT
router.use(authMiddleware);

// GET /appointments/my - Xem danh sách lịch hẹn của tôi (Đặt trước /:id)
router.get('/my', validate(myAppointmentsQuerySchema, 'query'), (req, res) =>
  controller.getMyAppointments(req, res),
);

// POST /appointments - Đặt lịch khám mới (Patient, Receptionist, Admin)
router.post(
  '/',
  roleGuard(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(createAppointmentSchema),
  (req, res) => controller.create(req, res),
);

// PATCH /appointments/:id/cancel - Hủy lịch hẹn
router.patch(
  '/:id/cancel',
  roleGuard(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(cancelAppointmentSchema),
  (req, res) => controller.cancel(req, res),
);

// PATCH /appointments/:id/reschedule - Dời lịch khám
router.patch(
  '/:id/reschedule',
  roleGuard(UserRole.PATIENT, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(rescheduleAppointmentSchema),
  (req, res) => controller.reschedule(req, res),
);

// GET /appointments - Lấy danh sách lịch hẹn (Tiếp tân, Bác sĩ, Admin)
router.get('/', validate(appointmentQuerySchema, 'query'), (req, res) =>
  controller.findAll(req, res),
);

// GET /appointments/:id - Xem chi tiết lịch hẹn
router.get('/:id', (req, res) => controller.findOne(req, res));

// PATCH /appointments/:id/status - Cập nhật trạng thái khám (Receptionist, Doctor, Admin)
router.patch(
  '/:id/status',
  roleGuard(UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.ADMIN),
  validate(updateStatusSchema),
  (req, res) => controller.updateStatus(req, res),
);

// POST /appointments/checkin/:bookingCode - Quét QR check-in (Receptionist)
router.post('/checkin/:bookingCode', roleGuard(UserRole.RECEPTIONIST), (req, res) =>
  controller.checkInByQR(req, res),
);

export default router;
