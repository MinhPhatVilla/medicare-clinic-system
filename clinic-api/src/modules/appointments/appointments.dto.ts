/**
 * @file src/modules/appointments/appointments.dto.ts
 * @description DTOs và Zod validation schemas cho Appointment module
 */

import { z } from 'zod';
import { dateOnly, timeOnly } from '../../utils/validation';

/**
 * Schema đặt lịch khám mới
 * - Bệnh nhân chọn Bác sĩ, Ngày khám, Khung giờ (hoặc scheduleId), nhập triệu chứng ban đầu.
 * - Trạng thái mặc định: CONFIRMED hoặc PENDING
 */
export const createAppointmentSchema = z.object({
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid('Doctor ID không hợp lệ'),
  scheduleId: z.string().uuid('Schedule ID không hợp lệ').optional(),
  appointmentDate: dateOnly,
  appointmentTime: timeOnly,
  chiefComplaint: z
    .string()
    .min(5, 'Triệu chứng ban đầu ít nhất 5 ký tự')
    .max(500, 'Triệu chứng không quá 500 ký tự'),
  status: z.enum(['PENDING', 'CONFIRMED']).default('CONFIRMED'),
  type: z.enum(['ONLINE', 'WALK_IN', 'PHONE']).default('ONLINE'),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

/**
 * Schema hủy lịch hẹn
 */
export const cancelAppointmentSchema = z.object({
  cancellationReason: z
    .string()
    .min(3, 'Lý do hủy lịch phải ít nhất 3 ký tự')
    .max(500, 'Lý do hủy không quá 500 ký tự'),
});

export type CancelAppointmentDto = z.infer<typeof cancelAppointmentSchema>;

/**
 * Schema dời lịch khám (Reschedule)
 */
export const rescheduleAppointmentSchema = z
  .object({
    newScheduleId: z.string().uuid('Schedule ID mới không hợp lệ').optional(),
    newDate: dateOnly.optional(),
    newTime: timeOnly.optional(),
    reason: z.string().max(500, 'Lý do không quá 500 ký tự').optional(),
  })
  .refine((data) => data.newScheduleId || (data.newDate && data.newTime), {
    message: 'Cần cung cấp newScheduleId hoặc cả newDate và newTime',
  });

export type RescheduleAppointmentDto = z.infer<typeof rescheduleAppointmentSchema>;

/**
 * Schema cập nhật trạng thái (Tiếp tân/Bác sĩ)
 */
export const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'CHECKED_IN',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'NO_SHOW',
  ]),
  cancellationReason: z.string().optional(),
  priorityNumber: z.number().int().positive().optional(),
});

export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;

/**
 * Schema query params cho danh sách chung
 */
export const appointmentQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
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
  date: dateOnly.optional(),
  doctorId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

export type AppointmentQueryDto = z.infer<typeof appointmentQuerySchema>;

/**
 * Schema query params cho API "Xem danh sách lịch hẹn của tôi"
 */
export const myAppointmentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().max(100000).default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
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
  from: dateOnly.optional(),
  to: dateOnly.optional(),
});

export type MyAppointmentsQueryDto = z.infer<typeof myAppointmentsQuerySchema>;
