/**
 * @file src/modules/examinations/examinations.dto.ts
 * @description DTOs và Zod validation schemas cho module Bác sĩ khám bệnh & MedicalRecords
 */

import { z } from 'zod';
import { dateOnly } from '../../utils/validation';

/**
 * Schema Lưu nháp thông tin khám bệnh (Auto-save draft)
 * Cho phép các trường sinh hiệu và lâm sàng nhận giá trị linh hoạt khi bác sĩ đang gõ
 */
export const saveDraftExaminationSchema = z.object({
  // Chỉ số sinh tồn (Vital Signs)
  weight: z.number().positive('Cân nặng phải là số dương').max(500).optional(),
  height: z.number().positive('Chiều cao phải là số dương').max(300).optional(),
  bloodPressure: z.string().max(20).optional(),
  heartRate: z.number().int().positive('Mạch phải là số nguyên dương').max(300).optional(),
  temperature: z.number().min(30).max(45, 'Thân nhiệt không hợp lệ').optional(),
  spo2: z.number().int().min(0).max(100, 'SpO2 trong khoảng 0-100%').optional(),
  respiratoryRate: z.number().int().positive().max(100).optional(),

  // Lâm sàng
  chiefComplaintDetail: z.string().max(2000).optional(),
  medicalHistory: z.string().max(2000).optional(),
  preliminaryDiagnosis: z.string().max(1000).optional(),
  diagnosis: z.string().max(2000).optional(),
  icd10Code: z.string().max(20).optional(),
  icd10Description: z.string().max(500).optional(),
  clinicalNotes: z.string().max(5000).optional(),
  treatmentPlan: z.string().max(5000).optional(),

  // Tái khám
  followUpDate: dateOnly.optional(),
  followUpNotes: z.string().max(1000).optional(),
});

export type SaveDraftExaminationDto = z.infer<typeof saveDraftExaminationSchema>;

/**
 * Schema Hoàn tất khám bệnh (Complete Examination)
 * Bắt buộc phải có chẩn đoán xác định
 */
export const completeExaminationSchema = saveDraftExaminationSchema
  .extend({
    diagnosis: z.string().trim().min(3).max(2000),
  })
  .strict();

export type CompleteExaminationDto = z.infer<typeof completeExaminationSchema>;

/**
 * Schema query danh sách hàng đợi
 */
export const waitingQueueQuerySchema = z.object({
  date: dateOnly.optional(),
});

export type WaitingQueueQueryDto = z.infer<typeof waitingQueueQuerySchema>;
