/**
 * @file src/modules/service-orders/service-orders.routes.ts
 * @description Router cấu hình endpoints cho Quản lý Dịch vụ Kỹ thuật & Chỉ định Cận Lâm Sàng
 */

import { Router } from 'express';
import { ServiceOrdersController } from './service-orders.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../models/User.entity';
import {
  createServiceOrdersSchema,
  updateServiceOrderStatusSchema,
  payServiceOrdersSchema,
  createMedicalServiceSchema,
  enterServiceOrderResultSchema,
  technicianQueueQuerySchema,
} from './service-orders.dto';

const router = Router();
const controller = new ServiceOrdersController();

// Tất cả endpoints đều yêu cầu xác thực JWT
router.use(authMiddleware);

// ============================================================
// SERVICE CATALOG (DANH MỤC DỊCH VỤ NIÊM YẾT)
// ============================================================

/**
 * @route   GET /api/v1/service-orders/catalog
 * @desc    Lấy danh mục dịch vụ kỹ thuật kèm giá niêm yết
 * @access  All authenticated roles
 */
router.get('/catalog', controller.getCatalog);

/**
 * @route   POST /api/v1/service-orders/catalog
 * @desc    Thêm mới dịch vụ vào danh mục niêm yết
 * @access  ADMIN
 */
router.post(
  '/catalog',
  roleGuard(UserRole.ADMIN),
  validate(createMedicalServiceSchema),
  controller.createCatalogService,
);

// ============================================================
// KỸ THUẬT VIÊN XÉT NGHIỆM / CHẨN ĐOÁN HÌNH ẢNH (TECHNICIAN)
// ============================================================

/**
 * @route   GET /api/v1/service-orders/technician/queue
 * @desc    Lấy danh sách các chỉ định CLS đang chờ thực hiện (Pending Queue)
 * @access  TECHNICIAN, DOCTOR, ADMIN
 */
router.get(
  '/technician/queue',
  roleGuard(UserRole.TECHNICIAN, UserRole.DOCTOR, UserRole.ADMIN),
  validate(technicianQueueQuerySchema, 'query'),
  controller.getTechnicianQueue,
);

/**
 * @route   POST /api/v1/service-orders/:id/result
 * @desc    Kỹ thuật viên nhập kết quả CLS chi tiết (chỉ số, khoảng tham chiếu, ảnh đính kèm) & hoàn thành (COMPLETED)
 * @access  TECHNICIAN, DOCTOR, ADMIN
 */
router.post(
  '/:id/result',
  roleGuard(UserRole.TECHNICIAN, UserRole.DOCTOR, UserRole.ADMIN),
  validate(enterServiceOrderResultSchema),
  controller.enterResult,
);

// ============================================================
// SERVICE ORDERS (BÁC SĨ & ĐIỀU TRỊ)
// ============================================================

/**
 * @route   POST /api/v1/service-orders
 * @desc    Bác sĩ tạo một hoặc nhiều chỉ định CLS cho phiếu khám & tự động đồng bộ viện phí tạm tính
 * @access  DOCTOR, ADMIN
 */
router.post(
  '/',
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(createServiceOrdersSchema),
  controller.createOrders,
);

/**
 * @route   GET /api/v1/service-orders/examination/:examinationId/results
 * @desc    Bác sĩ điều trị xem lại toàn bộ kết quả CLS vừa cập nhật ngay trên màn hình khám bệnh
 * @access  DOCTOR, TECHNICIAN, ADMIN, PATIENT
 */
router.get(
  '/examination/:examinationId/results',
  roleGuard(UserRole.DOCTOR, UserRole.TECHNICIAN, UserRole.ADMIN, UserRole.PATIENT),
  controller.getDoctorExaminationResults,
);

/**
 * @route   GET /api/v1/service-orders/examination/:examinationId
 * @desc    Lấy danh sách các chỉ định CLS và viện phí tạm tính của phiếu khám
 * @access  DOCTOR, RECEPTIONIST, CASHIER, ADMIN, PATIENT
 */
router.get('/examination/:examinationId', controller.getOrdersByExamination);

/**
 * @route   POST /api/v1/service-orders/examination/:examinationId/pay
 * @desc    Thu ngân / Lễ tân xác nhận thu tiền các chỉ định CLS (chuyển sang PAID)
 * @access  RECEPTIONIST, CASHIER, ADMIN
 */
router.post(
  '/examination/:examinationId/pay',
  roleGuard(UserRole.RECEPTIONIST, UserRole.CASHIER, UserRole.ADMIN),
  validate(payServiceOrdersSchema),
  controller.payOrders,
);

/**
 * @route   PATCH /api/v1/service-orders/:id/status
 * @desc    Cập nhật trạng thái chỉ định CLS (PAID, IN_PROGRESS, COMPLETED kèm kết quả, CANCELLED)
 * @access  DOCTOR, RECEPTIONIST, CASHIER, TECHNICIAN, ADMIN
 */
router.patch(
  '/:id/status',
  roleGuard(
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.CASHIER,
    UserRole.TECHNICIAN,
    UserRole.ADMIN,
  ),
  validate(updateServiceOrderStatusSchema),
  controller.updateOrderStatus,
);

/**
 * @route   DELETE /api/v1/service-orders/:id
 * @desc    Hủy chỉ định CLS (khi còn ở trạng thái ORDERED) và trừ lại viện phí tạm tính
 * @access  DOCTOR, ADMIN
 */
router.delete('/:id', roleGuard(UserRole.DOCTOR, UserRole.ADMIN), controller.cancelOrder);

export default router;
