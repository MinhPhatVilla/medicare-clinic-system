/**
 * @file src/modules/reception/reception.routes.ts
 * @description Express Router cho module Lễ tân tiếp đón (Receptionist Intake)
 */

import { Router } from 'express';
import { ReceptionController } from './reception.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  searchTodayAppointmentsSchema,
  checkInSchema,
  walkInPatientSchema,
  doctorQueueQuerySchema,
} from './reception.dto';
import { UserRole } from '../../models/User.entity';

const router = Router();
const controller = new ReceptionController();

// Tất cả endpoints cần đăng nhập
router.use(authMiddleware);

// GET /reception/appointments/today - Tìm kiếm lịch hẹn trong ngày bằng Mã đặt lịch / SĐT
router.get(
  '/appointments/today',
  roleGuard(UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(searchTodayAppointmentsSchema, 'query'),
  (req, res) => controller.searchTodayAppointments(req, res),
);

// POST /reception/check-in - Check-in cấp STT khám bệnh và khởi tạo MedicalRecord WAITING
router.post(
  '/check-in',
  roleGuard(UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(checkInSchema),
  (req, res) => controller.checkIn(req, res),
);

// POST /reception/walk-in - Tiếp nhận nhanh bệnh nhân vãng lai không hẹn trước
router.post(
  '/walk-in',
  roleGuard(UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(walkInPatientSchema),
  (req, res) => controller.createWalkIn(req, res),
);

// GET /reception/queue/:doctorId - Xem hàng đợi khám bệnh của Bác sĩ trong ngày
router.get(
  '/queue/:doctorId',
  roleGuard(UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.ADMIN),
  validate(doctorQueueQuerySchema, 'query'),
  (req, res) => controller.getDoctorQueue(req, res),
);

export default router;
