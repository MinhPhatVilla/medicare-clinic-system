/**
 * @file src/modules/doctors/doctors.dto.ts
 * @description Data Transfer Objects cho Doctors và Doctor Schedules module (Zod schemas)
 */

import { z } from 'zod';
import { dateOnly } from '../../utils/validation';
import { Specialty } from '../../models/Doctor.entity';
import { listQuery } from '../../utils/validation';

export const doctorQuerySchema = listQuery.extend({
  specialty: z.nativeEnum(Specialty).optional(),
});

// Regex kiểm tra định dạng giờ HH:mm (24h)
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Regex định dạng ngày YYYY-MM-DD

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdateDoctorProfileDto:
 *       type: object
 *       properties:
 *         specialty:
 *           type: string
 *           enum: [Đa khoa, Nhi khoa, Tim mạch, Da liễu, Xương khớp, Tai mũi họng, Mắt, Thần kinh, Sản phụ khoa, Nha khoa]
 *           example: "Tim mạch"
 *         roomNumber:
 *           type: string
 *           example: "Phòng 102"
 *         consultationFee:
 *           type: number
 *           example: 300000
 *         qualification:
 *           type: string
 *           example: "Tiến sĩ, Bác sĩ Chuyên khoa II"
 *         experienceYears:
 *           type: integer
 *           example: 12
 *         bio:
 *           type: string
 *           example: "Bác sĩ có hơn 12 năm kinh nghiệm trong điều trị bệnh lý tim mạch"
 *         avatarUrl:
 *           type: string
 *           example: "https://example.com/avatar.jpg"
 *         isAvailable:
 *           type: boolean
 *           example: true
 */
export const updateDoctorProfileSchema = z.object({
  specialty: z.nativeEnum(Specialty).optional(),
  roomNumber: z.string().trim().max(50, 'Số phòng tối đa 50 ký tự').optional(),
  consultationFee: z
    .number()
    .positive('Giá khám phải lớn hơn 0')
    .max(100000000, 'Giá khám không hợp lý')
    .optional(),
  qualification: z.string().trim().max(50).optional(),
  experienceYears: z.number().int().nonnegative().optional(),
  bio: z.string().trim().optional(),
  avatarUrl: z.string().trim().url('Đường dẫn ảnh đại diện không hợp lệ').optional(),
  isAvailable: z.boolean().optional(),
});

export type UpdateDoctorProfileDto = z.infer<typeof updateDoctorProfileSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateDoctorScheduleDto:
 *       type: object
 *       required:
 *         - doctorId
 *         - workDate
 *         - startTime
 *         - endTime
 *       properties:
 *         doctorId:
 *           type: string
 *           format: uuid
 *         workDate:
 *           type: string
 *           format: date
 *           example: "2026-09-20"
 *         startTime:
 *           type: string
 *           example: "08:00"
 *         endTime:
 *           type: string
 *           example: "08:30"
 *         roomNumber:
 *           type: string
 *           example: "Phòng 102"
 *         maxPatients:
 *           type: integer
 *           default: 3
 *           example: 3
 *         notes:
 *           type: string
 *           example: "Khám định kỳ"
 */
export const createDoctorScheduleSchema = z
  .object({
    doctorId: z.string().uuid('ID bác sĩ phải là định dạng UUID'),
    workDate: dateOnly,
    startTime: z.string().regex(TIME_REGEX, 'Giờ bắt đầu định dạng HH:mm (VD 08:00)'),
    endTime: z.string().regex(TIME_REGEX, 'Giờ kết thúc định dạng HH:mm (VD 08:30)'),
    roomNumber: z.string().trim().max(50).optional(),
    maxPatients: z
      .number()
      .int()
      .min(1, 'Số bệnh nhân tối thiểu là 1')
      .max(50, 'Số bệnh nhân tối đa trong 1 slot là 50')
      .default(3),
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Giờ bắt đầu phải trước giờ kết thúc',
    path: ['endTime'],
  });

export type CreateDoctorScheduleDto = z.infer<typeof createDoctorScheduleSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     BulkCreateDoctorScheduleDto:
 *       type: object
 *       required:
 *         - doctorId
 *         - workDate
 *         - shiftStartTime
 *         - shiftEndTime
 *       properties:
 *         doctorId:
 *           type: string
 *           format: uuid
 *         workDate:
 *           type: string
 *           format: date
 *           example: "2026-09-20"
 *         shiftStartTime:
 *           type: string
 *           example: "08:00"
 *         shiftEndTime:
 *           type: string
 *           example: "11:30"
 *         slotDurationMinutes:
 *           type: integer
 *           default: 30
 *           example: 30
 *         maxPatientsPerSlot:
 *           type: integer
 *           default: 3
 *           example: 3
 *         roomNumber:
 *           type: string
 *           example: "Phòng 102"
 *         notes:
 *           type: string
 *           example: "Ca sáng"
 */
export const bulkCreateDoctorScheduleSchema = z
  .object({
    doctorId: z.string().uuid('ID bác sĩ phải là định dạng UUID'),
    workDate: dateOnly,
    shiftStartTime: z.string().regex(TIME_REGEX, 'Giờ bắt đầu ca định dạng HH:mm'),
    shiftEndTime: z.string().regex(TIME_REGEX, 'Giờ kết thúc ca định dạng HH:mm'),
    slotDurationMinutes: z
      .number()
      .int()
      .min(10, 'Thời lượng slot tối thiểu 10 phút')
      .max(120, 'Thời lượng slot tối đa 120 phút')
      .default(30),
    maxPatientsPerSlot: z
      .number()
      .int()
      .min(1, 'Tối thiểu 1 bệnh nhân/slot')
      .max(30, 'Tối đa 30 bệnh nhân/slot')
      .default(3),
    roomNumber: z.string().trim().max(50).optional(),
    notes: z.string().trim().optional(),
  })
  .refine((data) => data.shiftStartTime < data.shiftEndTime, {
    message: 'Giờ bắt đầu ca làm việc phải trước giờ kết thúc',
    path: ['shiftEndTime'],
  });

export type BulkCreateDoctorScheduleDto = z.infer<typeof bulkCreateDoctorScheduleSchema>;

/**
 * Schema tra cứu slot còn trống
 */
export const availableSlotsQuerySchema = z.object({
  date: dateOnly.optional(),
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export type AvailableSlotsQueryDto = z.infer<typeof availableSlotsQuerySchema>;
