/**
 * @file src/modules/examinations/examinations.dto.ts
 * @description DTOs và Zod validation schemas cho module Bác sĩ khám bệnh & MedicalRecords
 */

import { z } from 'zod';

/**
 * Schema Lưu nháp thông tin khám bệnh (Auto-save draft)
 * Cho phép các trường sinh hiệu và lâm sàng nhận giá trị linh hoạt khi bác sĩ đang gõ
 */
export const saveDraftExaminationSchema = z.object({
  // Chỉ số sinh tồn (Vital Signs)
  weight: z.number().positive('Cân nặng phải là số dương').max(500).optional(),
  height: z.number().positive('Chiều cao phải là số dương').max(300).optional(),
  bloodPressure: z.string().max(30).optional(),
  heartRate: z.number().int().positive('Mạch phải là số nguyên dương').max(300).optional(),
  temperature: z.number().min(30).max(45, 'Thân nhiệt không hợp lệ').optional(),
  spo2: z.number().min(0).max(100, 'SpO2 trong khoảng 0-100%').optional(),
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
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày tái khám phải theo format YYYY-MM-DD')
    .optional(),
  followUpNotes: z.string().max(1000).optional(),
});

export type SaveDraftExaminationDto = z.infer<typeof saveDraftExaminationSchema>;

/**
 * Schema Hoàn tất khám bệnh (Complete Examination)
 * Bắt buộc phải có chẩn đoán xác định
 */
export const completeExaminationSchema = z.object({
  // Chỉ số sinh tồn
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  bloodPressure: z.string().optional(),
  heartRate: z.number().int().positive().optional(),
  temperature: z.number().optional(),
  spo2: z.number().min(0).max(100).optional(),
  respiratoryRate: z.number().int().positive().optional(),

  // Lâm sàng
  chiefComplaintDetail: z.string().optional(),
  medicalHistory: z.string().optional(),
  preliminaryDiagnosis: z.string().optional(),
  diagnosis: z.string().min(3, 'Chẩn đoán xác định ít nhất 3 ký tự'),
  icd10Code: z.string().optional(),
  icd10Description: z.string().optional(),
  clinicalNotes: z.string().optional(),
  treatmentPlan: z.string().optional(),

  // Tái khám
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  followUpNotes: z.string().optional(),

  // Đơn thuốc (tùy chọn)
  prescription: z
    .array(
      z.object({
        name: z.string().min(1),
        dosage: z.string(),
        frequency: z.string(),
        duration: z.string(),
        instruction: z.string(),
      }),
    )
    .optional(),

  // Chỉ định cận lâm sàng (tùy chọn)
  labTests: z
    .array(
      z.object({
        testName: z.string().min(1),
        testCode: z.string(),
        notes: z.string().optional().default(''),
      }),
    )
    .optional(),
});

export type CompleteExaminationDto = z.infer<typeof completeExaminationSchema>;

/**
 * Schema query danh sách hàng đợi
 */
export const waitingQueueQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo format YYYY-MM-DD')
    .optional(),
});

export type WaitingQueueQueryDto = z.infer<typeof waitingQueueQuerySchema>;
