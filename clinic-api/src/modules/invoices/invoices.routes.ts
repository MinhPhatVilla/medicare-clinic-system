/**
 * @file src/modules/invoices/invoices.routes.ts
 * @description Định tuyến API cho Module Viện phí & Hóa đơn (Invoices)
 */

import { createRouter } from '../../utils/router';
import { recordAccess } from '../../middlewares/recordAccess.middleware';
import { InvoicesController } from './invoices.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../models/User.entity';
import {
  invoiceQuerySchema,
  generateInvoiceSchema,
  invoicePrintQuerySchema,
  payInvoiceSchema,
  pharmacyQueueQuerySchema,
  invoiceIdSchema,
  examinationIdSchema,
  dispensingStatusSchema,
} from './invoices.dto';

const router = createRouter();
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
 * @route GET /api/v1/invoices/pharmacy/queue
 * @desc Màn hình Nhà thuốc lấy danh sách đơn thuốc đã thanh toán chờ chuẩn bị/phát thuốc
 * @access PHARMACIST, ADMIN
 */
router.get(
  '/pharmacy/queue',
  roleGuard(UserRole.PHARMACIST, UserRole.ADMIN),
  validate(pharmacyQueueQuerySchema, 'query'),
  controller.getPharmacyQueue,
);

router.get(
  '/pharmacy/events',
  roleGuard(UserRole.PHARMACIST, UserRole.ADMIN),
  controller.pharmacyEvents,
);
router.patch(
  '/pharmacy/prescriptions/:id/status',
  roleGuard(UserRole.PHARMACIST, UserRole.ADMIN),
  validate(invoiceIdSchema, 'params'),
  validate(dispensingStatusSchema),
  controller.updateDispensingStatus,
);
router.patch(
  '/:id/discharge',
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.PHARMACIST, UserRole.ADMIN),
  validate(invoiceIdSchema, 'params'),
  controller.discharge,
);

/**
 * @route GET /api/v1/invoices/:id
 * @desc Xem chi tiết hóa đơn kèm bảng kê viện phí minh bạch (Khám + CLS + Đơn thuốc)
 * @access CASHIER, RECEPTIONIST, ADMIN, PATIENT, DOCTOR, PHARMACIST
 */
router.get(
  '/:id',
  validate(invoiceIdSchema, 'params'),
  roleGuard(
    UserRole.CASHIER,
    UserRole.RECEPTIONIST,
    UserRole.ADMIN,
    UserRole.PATIENT,
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
  ),
  controller.getInvoiceDetail,
);

/**
 * @route GET /api/v1/invoices/:id/print?format=pdf|thermal
 * @desc In/xuất phiếu hóa đơn điện tử sau thanh toán
 * @access CASHIER, RECEPTIONIST, ADMIN, PATIENT
 */
router.get(
  '/:id/print',
  validate(invoiceIdSchema, 'params'),
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.PATIENT),
  validate(invoicePrintQuerySchema, 'query'),
  controller.exportInvoice,
);

/**
 * @route POST /api/v1/invoices/generate-from-examination/:examinationId
 * @desc Sinh hoặc cập nhật Hóa đơn tổng hợp tự động từ Phiếu khám bệnh
 * @access CASHIER, RECEPTIONIST, ADMIN, DOCTOR
 */
router.post(
  '/generate-from-examination/:examinationId',
  validate(examinationIdSchema, 'params'),
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR),
  validate(generateInvoiceSchema),
  recordAccess('examination', 'examinationId'),
  controller.generateFromExamination,
);

/**
 * @route PATCH /api/v1/invoices/:id/pay
 * @desc Quầy Thu ngân xác nhận thanh toán hóa đơn
 * @access CASHIER, RECEPTIONIST, ADMIN
 */
router.patch(
  '/:id/pay',
  validate(invoiceIdSchema, 'params'),
  roleGuard(UserRole.CASHIER, UserRole.RECEPTIONIST, UserRole.ADMIN),
  validate(payInvoiceSchema),
  controller.payInvoice,
);

export default router;
