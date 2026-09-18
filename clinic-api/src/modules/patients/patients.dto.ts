/**
 * @file src/modules/patients/patients.dto.ts
 * @description Data Transfer Objects cho Patients module (Zod schemas)
 */

import { z } from 'zod';
import { dateOnly } from '../../utils/validation';
import { normalizePhoneNumber } from '../../utils/phone.util';

// Regex CCCD (12 chữ số) hoặc CMND (9 chữ số)
const ID_CARD_REGEX = /^(\d{9}|\d{12})$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     CreatePatientDto:
 *       type: object
 *       required:
 *         - fullName
 *         - phone
 *       properties:
 *         fullName:
 *           type: string
 *           example: "Nguyễn Văn An"
 *         phone:
 *           type: string
 *           example: "0912345678"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1990-05-15"
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *           example: "MALE"
 *         idCardNumber:
 *           type: string
 *           example: "001090012345"
 *         insuranceNumber:
 *           type: string
 *           example: "DN4791234567890"
 *         address:
 *           type: string
 *           example: "Số 123 Đường Cầu Giấy, Hà Nội"
 *         bloodType:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *           example: "O+"
 *         allergies:
 *           type: string
 *           example: "Dị ứng Penicillin"
 *         chronicDiseases:
 *           type: string
 *           example: "Tăng huyết áp nhẹ"
 *         medicalHistory:
 *           type: string
 *           example: "Tiền sử mổ ruột thừa năm 2018"
 *         emergencyContactName:
 *           type: string
 *           example: "Nguyễn Văn B (Bố)"
 *         emergencyContactPhone:
 *           type: string
 *           example: "0987654321"
 */
export const createPatientSchema = z.object({
  fullName: z
    .string({ required_error: 'Họ tên bệnh nhân là bắt buộc' })
    .trim()
    .min(2, 'Họ tên ít nhất 2 ký tự')
    .max(100, 'Họ tên tối đa 100 ký tự'),
  phone: z
    .string({ required_error: 'Số điện thoại là bắt buộc' })
    .trim()
    .transform((val) => normalizePhoneNumber(val)),
  dateOfBirth: dateOnly.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  idCardNumber: z
    .string()
    .trim()
    .regex(ID_CARD_REGEX, 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số')
    .optional(),
  insuranceNumber: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().trim().max(500).optional(),
  chronicDiseases: z.string().trim().max(500).optional(),
  medicalHistory: z.string().trim().max(1000).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((val) => (val ? normalizePhoneNumber(val) : undefined))
    .optional(),
});

export type CreatePatientDto = z.infer<typeof createPatientSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     UpdatePatientDto:
 *       type: object
 *       properties:
 *         fullName:
 *           type: string
 *         phone:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *         gender:
 *           type: string
 *         idCardNumber:
 *           type: string
 *         insuranceNumber:
 *           type: string
 *         address:
 *           type: string
 *         bloodType:
 *           type: string
 *         allergies:
 *           type: string
 *         chronicDiseases:
 *           type: string
 *         medicalHistory:
 *           type: string
 *         emergencyContactName:
 *           type: string
 *         emergencyContactPhone:
 *           type: string
 */
export const updatePatientSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z
    .string()
    .trim()
    .transform((val) => normalizePhoneNumber(val))
    .optional(),
  dateOfBirth: dateOnly.optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  idCardNumber: z
    .string()
    .trim()
    .regex(ID_CARD_REGEX, 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số')
    .optional(),
  insuranceNumber: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  allergies: z.string().trim().max(500).optional(),
  chronicDiseases: z.string().trim().max(500).optional(),
  medicalHistory: z.string().trim().max(1000).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .transform((val) => (val ? normalizePhoneNumber(val) : undefined))
    .optional(),
});

export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;

/**
 * Schema tra cứu nhanh (Quick Lookup)
 */
export const quickLookupQuerySchema = z
  .object({
    phone: z.string().trim().optional(),
    code: z.string().trim().optional(),
    idCard: z.string().trim().optional(),
  })
  .refine(
    (data) => Boolean(data.phone || data.code || data.idCard),
    'Vui lòng cung cấp ít nhất một tiêu chí tra cứu (phone, code hoặc idCard)',
  );

export type QuickLookupQueryDto = z.infer<typeof quickLookupQuerySchema>;

/**
 * Schema phân trang và tìm kiếm danh sách bệnh nhân
 */
export const patientQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

export type PatientQueryDto = z.infer<typeof patientQuerySchema>;
