/**
 * @file src/modules/prescriptions/prescriptions.dto.ts
 * @description Data Transfer Objects (DTO) cho Kê đơn thuốc, Danh mục thuốc, ICD-10 & Hoàn tất khám
 */

import { z } from 'zod';
import { dateOnly } from '../../utils/validation';
import { MedicineUnit } from '../../models/PrescriptionDetail.entity';

/**
 * Schema từng mục thuốc kê trong đơn
 */
export const prescriptionItemSchema = z.object({
  medicineId: z.string().uuid('ID thuốc không hợp lệ').optional(),
  medicineCode: z.string().trim().max(30).optional(),
  medicineName: z
    .string({ required_error: 'Tên thuốc không được để trống' })
    .trim()
    .min(2, 'Tên thuốc phải có ít nhất 2 ký tự')
    .max(200, 'Tên thuốc tối đa 200 ký tự'),
  activeIngredient: z.string().trim().max(255).optional(),
  dosage: z.string().trim().max(50).optional(), // VD: "20mg", "500mg"
  routeOfAdministration: z.string().trim().default('Uống'),
  morningDose: z.number().min(0, 'Liều sáng không được âm').default(0),
  noonDose: z.number().min(0, 'Liều trưa không được âm').default(0),
  afternoonDose: z.number().min(0, 'Liều chiều không được âm').default(0),
  eveningDose: z.number().min(0, 'Liều tối không được âm').default(0),
  quantity: z.number().int().min(1, 'Số lượng thuốc phải từ 1 trở lên'),
  unit: z.nativeEnum(MedicineUnit).default(MedicineUnit.TABLET),
  unitPrice: z.number().min(0, 'Đơn giá thuốc không được âm').default(0),
  usageInstructions: z
    .string({ required_error: 'Cách dùng thuốc là bắt buộc' })
    .trim()
    .min(3, 'Cách dùng thuốc phải có ít nhất 3 ký tự'), // VD: "Uống sau ăn 30 phút"
  notes: z.string().trim().max(500).optional(),
});

export type PrescriptionItemDto = z.infer<typeof prescriptionItemSchema>;

/**
 * Schema Bác sĩ tạo đơn thuốc cho phiếu khám
 */
export const createPrescriptionSchema = z.object({
  examinationId: z
    .string({ required_error: 'Mã phiếu khám (examinationId) là bắt buộc' })
    .uuid('Mã phiếu khám phải là UUID hợp lệ'),
  diagnosisSummary: z.string().trim().optional(),
  dispensingNotes: z.string().trim().max(1000).optional(),
  medicines: z
    .array(prescriptionItemSchema, {
      required_error: 'Danh sách thuốc là bắt buộc',
    })
    .min(1, 'Đơn thuốc cần có ít nhất 1 loại thuốc'),
});

export type CreatePrescriptionDto = z.infer<typeof createPrescriptionSchema>;

/**
 * Schema Hoàn tất ca khám & Khóa hồ sơ (Complete and Lock)
 */
export const completeAndLockSchema = z.object({
  diagnosis: z
    .string({ required_error: 'Chẩn đoán xác định là bắt buộc khi kết thúc ca khám' })
    .trim()
    .min(3, 'Chẩn đoán xác định phải có ít nhất 3 ký tự')
    .max(1000, 'Chẩn đoán tối đa 1000 ký tự'),
  icd10Code: z.string().trim().max(20).optional(),
  icd10Description: z.string().trim().optional(),
  clinicalNotes: z.string().trim().optional(),
  treatmentPlan: z.string().trim().optional(),
  followUpDate: dateOnly.optional(),
  followUpNotes: z.string().trim().max(1000).optional(),
  prescription: z
    .object({
      dispensingNotes: z.string().trim().optional(),
      medicines: z.array(prescriptionItemSchema).min(1),
    })
    .optional(),
});

export type CompleteAndLockDto = z.infer<typeof completeAndLockSchema>;

/**
 * Schema tra cứu danh mục thuốc
 */
export const medicineCatalogQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MedicineCatalogQueryDto = z.infer<typeof medicineCatalogQuerySchema>;

/**
 * Schema tra cứu mã bệnh ICD-10
 */
export const icd10QuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type Icd10QueryDto = z.infer<typeof icd10QuerySchema>;
