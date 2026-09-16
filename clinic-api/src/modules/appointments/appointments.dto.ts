/**
 * @file src/modules/appointments/appointments.dto.ts
 * @description DTOs cho Appointment module
 */

import { z } from 'zod';

// Schema đặt lịch khám mới
export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Doctor ID không hợp lệ'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày phải theo format YYYY-MM-DD'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Giờ phải theo format HH:MM'),
  chiefComplaint: z.string().min(5, 'Lý do khám ít nhất 5 ký tự').max(500),
  type: z.enum(['ONLINE', 'WALK_IN', 'PHONE']).default('ONLINE'),
});

export type CreateAppointmentDto = z.infer<typeof createAppointmentSchema>;

// Schema cập nhật trạng thái (Tiếp tân dùng)
export const updateStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']),
  cancellationReason: z.string().optional(),
  priorityNumber: z.number().int().positive().optional(),
});

export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;

// Schema query params cho list
export const appointmentQuerySchema = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
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
  date: z.string().optional(),
  doctorId: z.string().uuid().optional(),
});

export type AppointmentQueryDto = z.infer<typeof appointmentQuerySchema>;
