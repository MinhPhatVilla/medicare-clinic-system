/**
 * @file src/modules/reception/reception.dto.ts
 * @description DTOs và Zod validation schemas cho module Lễ tân tiếp đón (Receptionist Intake)
 */

import { z } from 'zod';
import { isValidPhoneNumber, normalizePhoneNumber } from '../../utils/phone.util';
import { Gender } from '../../models/Patient.entity';

/**
 * Schema tra cứu lịch hẹn trong ngày
 * Cho phép tìm theo Mã đặt lịch (bookingCode) hoặc Số điện thoại (phone)
 */
export const searchTodayAppointmentsSchema = z.object({
  query: z.string().trim().min(1, 'Từ khóa tìm kiếm không được để trống'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo format YYYY-MM-DD')
    .optional(),
  doctorId: z.string().uuid('Doctor ID không hợp lệ').optional(),
  status: z
    .enum([
      'PENDING',
      'CONFIRMED',
      'CHECKED_IN',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type SearchTodayAppointmentsDto = z.infer<typeof searchTodayAppointmentsSchema>;

/**
 * Schema Check-in tại quầy lễ tân
 * Hỗ trợ check-in bằng ID lịch hẹn hoặc quét Mã phiếu khám (bookingCode / QR)
 */
export const checkInSchema = z
  .object({
    appointmentId: z.string().uuid('Appointment ID không hợp lệ').optional(),
    bookingCode: z.string().trim().min(3, 'Mã phiếu khám không hợp lệ').optional(),
  })
  .refine((data) => data.appointmentId || data.bookingCode, {
    message: 'Vui lòng cung cấp appointmentId hoặc bookingCode để thực hiện check-in',
  });

export type CheckInDto = z.infer<typeof checkInSchema>;

/**
 * Schema tiếp nhận bệnh nhân vãng lai (Walk-in Patient)
 * - Có thể chọn bệnh nhân cũ đã có trong hệ thống (patientId)
 * - Hoặc tạo nhanh thông tin bệnh nhân mới (fullName, phone,...)
 */
export const walkInPatientSchema = z
  .object({
    // Bệnh nhân đã có sẵn hồ sơ
    patientId: z.string().uuid('Patient ID không hợp lệ').optional(),

    // Thông tin tạo nhanh bệnh nhân mới (nếu chưa có profile)
    fullName: z
      .string()
      .trim()
      .min(2, 'Họ tên ít nhất 2 ký tự')
      .max(100, 'Họ tên không vượt quá 100 ký tự')
      .optional(),
    phone: z
      .string()
      .trim()
      .refine(isValidPhoneNumber, 'Số điện thoại Việt Nam không hợp lệ')
      .transform(normalizePhoneNumber)
      .optional(),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải theo định dạng YYYY-MM-DD')
      .optional(),
    gender: z.nativeEnum(Gender).default(Gender.MALE).optional(),
    idCardNumber: z
      .string()
      .regex(/^[0-9]{9}$|^[0-9]{12}$/, 'Số CCCD/CMND phải gồm 9 hoặc 12 chữ số')
      .optional(),
    address: z.string().trim().max(255).optional(),
    medicalHistory: z.string().trim().max(1000).optional(),

    // Thông tin ca khám
    doctorId: z.string().uuid('Doctor ID không hợp lệ'),
    chiefComplaint: z
      .string()
      .trim()
      .min(3, 'Triệu chứng / lý do khám ít nhất 3 ký tự')
      .max(500, 'Triệu chứng không vượt quá 500 ký tự'),
    roomNumber: z.string().trim().max(50).optional(),
  })
  .refine(
    (data) => {
      // Phải có patientId HOẶC có cả fullName và phone
      if (data.patientId) return true;
      return !!(data.fullName && data.phone);
    },
    {
      message: 'Vui lòng chọn bệnh nhân có sẵn hoặc nhập đầy đủ Họ tên và Số điện thoại',
    },
  );

export type WalkInPatientDto = z.infer<typeof walkInPatientSchema>;

/**
 * Schema xem hàng đợi khám bệnh của bác sĩ trong ngày
 */
export const doctorQueueQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo format YYYY-MM-DD')
    .optional(),
});

export type DoctorQueueQueryDto = z.infer<typeof doctorQueueQuerySchema>;

import type { Appointment } from '../../models/Appointment.entity';
import type { Patient } from '../../models/Patient.entity';
import type { Examination } from '../../models/Examination.entity';

/**
 * Các interface kết quả trả về của module Reception
 */
export interface CheckInResult {
  message: string;
  appointment: Appointment;
  medicalRecord: Examination | null;
  priorityNumber: number;
  alreadyCheckedIn: boolean;
}

export interface WalkInResult {
  message: string;
  patient: Patient;
  doctor: {
    id: string;
    fullName: string;
    specialty: string;
    roomNumber: string;
  };
  appointment: Appointment;
  medicalRecord: Examination;
  priorityNumber: number;
}

export interface DoctorQueueResult {
  date: string;
  doctor: {
    id: string;
    fullName?: string;
    specialty: string;
    roomNumber?: string;
  };
  totalWaiting: number;
  currentInProgress: Appointment | null;
  queue: Appointment[];
}
