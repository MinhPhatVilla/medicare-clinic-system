/**
 * @file src/modules/prescriptions/prescriptions.routes.ts
 * @description Router cấu hình endpoints cho Kê đơn thuốc, Tra cứu thuốc, ICD-10 & Hoàn tất khám
 */

import { Router } from 'express';
import { PrescriptionsController } from './prescriptions.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../models/User.entity';
import {
  createPrescriptionSchema,
  completeAndLockSchema,
  medicineCatalogQuerySchema,
  icd10QuerySchema,
} from './prescriptions.dto';

const router = Router();
const controller = new PrescriptionsController();

router.use(authMiddleware);

// ============================================================
// DANH MỤC THUỐC & ICD-10
// ============================================================

/**
 * @route   GET /api/v1/prescriptions/medicines
 * @desc    Tra cứu danh mục thuốc
 * @access  All authenticated roles
 */
router.get('/medicines', validate(medicineCatalogQuerySchema, 'query'), controller.getMedicines);

/**
 * @route   GET /api/v1/prescriptions/icd10
 * @desc    Tra cứu danh mục mã bệnh ICD-10
 * @access  All authenticated roles
 */
router.get('/icd10', validate(icd10QuerySchema, 'query'), controller.getIcd10Catalog);

// ============================================================
// KÊ ĐƠN & HOÀN TẤT KHÁM BỆNH
// ============================================================

/**
 * @route   POST /api/v1/prescriptions
 * @desc    Bác sĩ kê đơn thuốc cho ca khám
 * @access  DOCTOR, ADMIN
 */
router.post(
  '/',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(createPrescriptionSchema),
  controller.createPrescription,
);

/**
 * @route   GET /api/v1/prescriptions/examination/:examinationId
 * @desc    Lấy chi tiết đơn thuốc của phiếu khám
 * @access  DOCTOR, RECEPTIONIST, CASHIER, ADMIN, PATIENT
 */
router.get(
  '/examination/:examinationId',
  roleGuard(
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
    UserRole.ADMIN,
    UserRole.PATIENT,
  ),
  controller.getPrescriptionByExamination,
);

/**
 * @route   POST /api/v1/prescriptions/examination/:examinationId/complete-and-lock
 * @desc    Bác sĩ hoàn tất ca khám, khóa hồ sơ bệnh án và chuyển dữ liệu sang quầy Thu ngân
 * @access  DOCTOR, ADMIN
 */
router.post(
  '/examination/:examinationId/complete-and-lock',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(completeAndLockSchema),
  controller.completeAndLockExamination,
);

export default router;
