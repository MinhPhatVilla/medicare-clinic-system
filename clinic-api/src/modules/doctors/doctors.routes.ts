/**
 * @file src/modules/doctors/doctors.routes.ts
 * @description Express Router cho Doctors và Doctor Schedules module
 */

import { createRouter } from '../../utils/router';
import { DoctorsController } from './doctors.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  updateDoctorProfileSchema,
  createDoctorScheduleSchema,
  bulkCreateDoctorScheduleSchema,
  availableSlotsQuerySchema,
  doctorQuerySchema,
} from './doctors.dto';
import { UserRole } from '../../models/User.entity';

const router = createRouter();
const controller = new DoctorsController();

// ============================================================
// PUBLIC ROUTES (Dành cho bệnh nhân xem thông tin & đặt lịch)
// ============================================================

// GET /doctors - Danh sách bác sĩ
router.get('/', validate(doctorQuerySchema, 'query'), (req, res) => controller.findAll(req, res));

// GET /doctors/:id/available-slots - Tra cứu các slot còn trống theo ngày/tuần
router.get('/:id/available-slots', validate(availableSlotsQuerySchema, 'query'), (req, res) =>
  controller.getAvailableSlots(req, res),
);

// GET /doctors/:id/schedule - Backward compatible
router.get('/:id/schedule', validate(availableSlotsQuerySchema, 'query'), (req, res) =>
  controller.getDoctorSchedules(req, res),
);

// GET /doctors/:id/schedules - Lấy toàn bộ lịch của bác sĩ
router.get('/:id/schedules', validate(availableSlotsQuerySchema, 'query'), (req, res) =>
  controller.getDoctorSchedules(req, res),
);

// GET /doctors/:id - Chi tiết thông tin bác sĩ
router.get('/:id', (req, res) => controller.findById(req, res));

// ============================================================
// PROTECTED ROUTES (Dành cho Bác sĩ và Admin)
// ============================================================

// POST /doctors/schedules - Đăng ký một khung giờ (Slot) làm việc
router.post(
  '/schedules',
  authMiddleware,
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(createDoctorScheduleSchema),
  (req, res) => controller.createSchedule(req, res),
);

// POST /doctors/schedules/bulk - Đăng ký ca làm việc tự động chia slot
router.post(
  '/schedules/bulk',
  authMiddleware,
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(bulkCreateDoctorScheduleSchema),
  (req, res) => controller.bulkCreateSchedule(req, res),
);

// PATCH /doctors/:id - Cập nhật thông tin bác sĩ (chuyên khoa, số phòng, giá khám)
router.patch(
  '/:id',
  authMiddleware,
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(updateDoctorProfileSchema),
  (req, res) => controller.update(req, res),
);

// DELETE /doctors/schedules/:scheduleId - Hủy khung giờ làm việc
router.delete(
  '/schedules/:scheduleId',
  authMiddleware,
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  (req, res) => controller.deleteSchedule(req, res),
);

export default router;
