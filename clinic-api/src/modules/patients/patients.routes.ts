/**
 * @file src/modules/patients/patients.routes.ts
 * @description Express Router cho Patients module
 */

import { Router } from 'express';
import { PatientsController } from './patients.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createPatientSchema,
  updatePatientSchema,
  patientQuerySchema,
  quickLookupQuerySchema,
} from './patients.dto';
import { UserRole } from '../../models/User.entity';

const router = Router();
const controller = new PatientsController();

// Tất cả các routes đều yêu cầu đăng nhập
router.use(authMiddleware);

// GET /patients/lookup - Tra cứu nhanh theo SĐT, Mã BN hoặc CCCD (Tiếp tân, Bác sĩ, Thu ngân, Admin)
router.get(
  '/lookup',
  roleGuard(UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.CASHIER, UserRole.ADMIN),
  validate(quickLookupQuerySchema, 'query'),
  (req, res) => controller.quickLookup(req, res),
);

// GET /patients/me - Xem hồ sơ của chính bệnh nhân đang đăng nhập
router.get('/me', roleGuard(UserRole.PATIENT), (req, res) => controller.findMe(req, res));

// GET /patients - Danh sách bệnh nhân có phân trang (Tiếp tân, Bác sĩ, Admin)
router.get(
  '/',
  roleGuard(UserRole.RECEPTIONIST, UserRole.DOCTOR, UserRole.ADMIN),
  validate(patientQuerySchema, 'query'),
  (req, res) => controller.findAll(req, res),
);

// GET /patients/:id - Chi tiết bệnh nhân (Bệnh nhân chỉ xem của mình, nhân viên xem tất cả)
router.get('/:id', (req, res) => controller.findById(req, res));

// POST /patients - Tạo mới hồ sơ bệnh nhân (Tiếp tân, Admin)
router.post(
  '/',
  roleGuard(UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(createPatientSchema),
  (req, res) => controller.create(req, res),
);

// PATCH /patients/:id - Cập nhật hồ sơ bệnh nhân
router.patch('/:id', validate(updatePatientSchema), (req, res) => controller.update(req, res));

// DELETE /patients/:id - Vô hiệu hóa hồ sơ bệnh nhân (Admin)
router.delete('/:id', roleGuard(UserRole.ADMIN), (req, res) => controller.delete(req, res));

export default router;
