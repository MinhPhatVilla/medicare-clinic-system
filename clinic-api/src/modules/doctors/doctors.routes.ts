/**
 * @file src/modules/doctors/doctors.routes.ts
 * @description Router + Controller + Service cho Doctors module (compact)
 *
 * Kiến trúc đơn giản hóa: Với module ít logic, có thể gộp lại 1 file
 * trong giai đoạn đầu, sau đó tách ra khi cần thiết.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../config/database';
import { Doctor } from '../../models/Doctor.entity';
import { ApiResponse } from '../../utils/ApiResponse';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { paginate } from '../../utils/pagination';
import { NotFoundError } from '../../exceptions/AppError';
import { UserRole } from '../../models/User.entity';

const router = Router();
const doctorRepo = AppDataSource.getRepository(Doctor);

// Schema cập nhật thông tin bác sĩ
const updateDoctorSchema = z.object({
  specialty: z.string().optional(),
  qualification: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.number().positive().optional(),
  workingDays: z.array(z.string()).optional(),
  workingHoursStart: z.string().optional(),
  workingHoursEnd: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

// GET /doctors - Danh sách bác sĩ (public — bệnh nhân chọn bác sĩ)
router.get('/', async (req: Request, res: Response) => {
  const qb = doctorRepo
    .createQueryBuilder('doctor')
    .leftJoinAndSelect('doctor.user', 'user')
    .where('user.isActive = true')
    .orderBy('doctor.rating', 'DESC');

  // Filter theo chuyên khoa
  if (req.query.specialty) {
    qb.andWhere('doctor.specialty = :specialty', { specialty: req.query.specialty });
  }

  const result = await paginate(qb, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
  });

  ApiResponse.success(res, result.data, 'Lấy danh sách bác sĩ thành công', 200, result.meta);
});

// GET /doctors/:id - Chi tiết bác sĩ (public)
router.get('/:id', async (req: Request, res: Response) => {
  const doctor = await doctorRepo.findOne({
    where: { id: req.params.id },
    relations: ['user'],
  });

  if (!doctor) throw new NotFoundError('Bác sĩ');
  ApiResponse.success(res, doctor, 'Thành công');
});

// GET /doctors/:id/schedule - Lịch làm việc của bác sĩ (public)
router.get('/:id/schedule', async (req: Request, res: Response) => {
  const doctor = await doctorRepo.findOne({ where: { id: req.params.id } });
  if (!doctor) throw new NotFoundError('Bác sĩ');

  // Trả về working schedule
  ApiResponse.success(
    res,
    {
      workingDays: doctor.workingDays,
      workingHoursStart: doctor.workingHoursStart,
      workingHoursEnd: doctor.workingHoursEnd,
    },
    'Thành công',
  );
});

// PATCH /doctors/:id - Cập nhật thông tin bác sĩ (Admin, chính bác sĩ đó)
router.patch(
  '/:id',
  authMiddleware,
  roleGuard(UserRole.DOCTOR, UserRole.ADMIN),
  validate(updateDoctorSchema),
  async (req: Request, res: Response) => {
    const doctor = await doctorRepo.findOne({ where: { id: req.params.id } });
    if (!doctor) throw new NotFoundError('Bác sĩ');

    Object.assign(doctor, req.body);
    const updated = await doctorRepo.save(doctor);
    ApiResponse.success(res, updated, 'Cập nhật thông tin bác sĩ thành công');
  },
);

export default router;
