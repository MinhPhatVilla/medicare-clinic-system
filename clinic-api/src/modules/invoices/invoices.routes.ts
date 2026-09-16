/**
 * @file src/modules/invoices/invoices.routes.ts
 * @description Định tuyến API cho Module Viện phí & Hóa đơn (Invoices)
 */

import { Router } from 'express';
import { InvoicesController } from './invoices.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../models/User.entity';
import {
  invoiceQuerySchema,
  generateInvoiceSchema,
  payInvoiceSchema,
} from './invoices.dto';

const router = Router();
const controller = new InvoicesController();

// Mọi endpoint đều yêu cầu đăng nhập
router.use(authMiddleware);

/**
 * @route GET /api/v1/invoices
 * @desc Tra cứu danh sách hóa đơn theo mã phiếu khám, mã bệnh nhân, SĐT, số hóa đơn, trạng thái
 * @access CASHIER, RECEPTIONIST, ADMIN
 */
router.get(
  '/',
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(invoiceQuerySchema, 'query'),
  controller.getInvoices,
);

/**
 * @route GET /api/v1/invoices/:id
 * @desc Xem chi tiết hóa đơn kèm bảng kê viện phí minh bạch (Khám + CLS + Đơn thuốc)
 * @access CASHIER, RECEPTIONIST, ADMIN, PATIENT, DOCTOR
 */
router.get(
  '/:id',
  roleGuard(
    UserRole.CASHIER,
    UserRole.RECEPTIONIST,
    UserRole.ADMIN,
    UserRole.PATIENT,
    UserRole.DOCTOR,
  ),
  controller.getInvoiceDetail,
);

/**
 * @route POST /api/v1/invoices/generate-from-examination/:examinationId
 * @desc Sinh hoặc cập nhật Hóa đơn tổng hợp tự động từ Phiếu khám bệnh
 * @access CASHIER, RECEPTIONIST, ADMIN, DOCTOR
 */
router.post(
  '/generate-from-examination/:examinationId',
  roleGuard(
    UserRole.CASHIER,
    UserRole.RECEPTIONIST,
    UserRole.ADMIN,
    UserRole.DOCTOR,
  ),
  validate(generateInvoiceSchema),
  controller.generateFromExamination,
);

/**
 * @route PATCH /api/v1/invoices/:id/pay
 * @desc Quầy Thu ngân xác nhận thanh toán hóa đơn
 * @access CASHIER, RECEPTIONIST, ADMIN
 */
router.patch(
  '/:id/pay',
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(payInvoiceSchema),
  controller.payInvoice,
);

export default router;
