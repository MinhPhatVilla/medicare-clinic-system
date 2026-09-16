/**
 * @file src/modules/auth/auth.dto.ts
 * @description Data Transfer Objects cho Auth module (Zod schemas)
 *
 * DTO (Data Transfer Object): Định nghĩa shape của dữ liệu
 * đi vào và ra khỏi API endpoints.
 * Zod vừa validate vừa infer TypeScript types → không cần viết type 2 lần.
 */

import { z } from 'zod';

/**
 * @swagger
 * components:
 *   schemas:
 *     LoginDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: patient@medicare.vn
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "123456"
 */
export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu ít nhất 6 ký tự'),
});

export type LoginDto = z.infer<typeof loginSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *         - role
 */
export const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu ít nhất 6 ký tự')
    .regex(/[A-Z]/, 'Cần ít nhất 1 chữ hoa')
    .regex(/[0-9]/, 'Cần ít nhất 1 chữ số'),
  fullName: z.string().min(2, 'Họ tên ít nhất 2 ký tự').max(100),
  phone: z
    .string()
    .regex(/^(0|\+84)[3-9]\d{8}$/, 'Số điện thoại không hợp lệ')
    .optional(),
  role: z.enum(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'ADMIN']).default('PATIENT'),
});

export type RegisterDto = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string().min(6),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
