/**
 * @file src/modules/patients/patients.routes.ts
 * @description Router cho Patients module (Quản lý hồ sơ bệnh nhân)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AppDataSource } from '../../config/database';
import { Patient } from '../../models/Patient.entity';
import { ApiResponse } from '../../utils/ApiResponse';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { NotFoundError, ForbiddenError } from '../../exceptions/AppError';
import { UserRole } from '../../models/User.entity';
import { paginate } from '../../utils/pagination';

const router = Router();
const patientRepo = AppDataSource.getRepository(Patient);

router.use(authMiddleware);

const updatePatientSchema = z.object({
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().optional(),
  chronicDiseases: z.string().optional(),
  insuranceNumber: z.string().optional(),
  idCardNumber: z.string().optional(),
});

// GET /patients - Danh sách bệnh nhân (Receptionist, Admin)
router.get(
  '/',
  roleGuard(UserRole.RECEPTIONIST, UserRole.ADMIN, UserRole.DOCTOR),
  async (req: Request, res: Response) => {
    const qb = patientRepo
      .createQueryBuilder('patient')
      .leftJoinAndSelect('patient.user', 'user')
      .where('user.isActive = true')
      .orderBy('user.createdAt', 'DESC');

    // Tìm kiếm theo tên/email
    if (req.query.search) {
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${req.query.search}%`,
      });
    }

    const result = await paginate(qb, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    });

    ApiResponse.success(res, result.data, 'Thành công', 200, result.meta);
  },
);

// GET /patients/me - Hồ sơ của bệnh nhân hiện tại
router.get('/me', roleGuard(UserRole.PATIENT), async (req: Request, res: Response) => {
  const patient = await patientRepo.findOne({
    where: { userId: req.user!.id },
    relations: ['user'],
  });

  if (!patient) throw new NotFoundError('Hồ sơ bệnh nhân');
  ApiResponse.success(res, patient, 'Thành công');
});

// GET /patients/:id - Chi tiết bệnh nhân
router.get('/:id', async (req: Request, res: Response) => {
  const patient = await patientRepo.findOne({
    where: { id: req.params.id },
    relations: ['user', 'appointments'],
  });

  if (!patient) throw new NotFoundError('Bệnh nhân');

  // Patient chỉ được xem hồ sơ của bản thân
  if (req.user!.role === UserRole.PATIENT && patient.userId !== req.user!.id) {
    throw new ForbiddenError();
  }

  ApiResponse.success(res, patient, 'Thành công');
});

// PATCH /patients/:id - Cập nhật hồ sơ bệnh nhân
router.patch('/:id', validate(updatePatientSchema), async (req: Request, res: Response) => {
  const patient = await patientRepo.findOne({ where: { id: req.params.id } });
  if (!patient) throw new NotFoundError('Bệnh nhân');

  // Patient chỉ được cập nhật hồ sơ của mình
  if (req.user!.role === UserRole.PATIENT && patient.userId !== req.user!.id) {
    throw new ForbiddenError();
  }

  Object.assign(patient, req.body);
  const updated = await patientRepo.save(patient);
  ApiResponse.success(res, updated, 'Cập nhật hồ sơ thành công');
});

export default router;
