/**
 * @file src/modules/auth/auth.dto.ts
 * @description Data Transfer Objects cho Auth module (Zod schemas)
 *
 * DTO (Data Transfer Object): Định nghĩa shape và ràng buộc dữ liệu
 * đi vào API endpoints. Sử dụng Zod để runtime validation và suy diễn type-safe.
 */

import { z } from 'zod';

// Regex kiểm tra số điện thoại Việt Nam chuẩn (10 chữ số)
const VIETNAM_PHONE_REGEX = /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;

// Regex kiểm tra mật khẩu mạnh: ít nhất 1 chữ thường, 1 chữ hoa, 1 số
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterPatientDto:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: benhnhan@gmail.com
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "Patient@123"
 *         fullName:
 *           type: string
 *           example: "Nguyễn Văn An"
 *         phone:
 *           type: string
 *           example: "0912345678"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           example: "1995-08-20"
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER]
 *           example: "MALE"
 *         address:
 *           type: string
 *           example: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội"
 *         bloodType:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *           example: "O+"
 *         insuranceNumber:
 *           type: string
 *           example: "DN4791234567890"
 *         idCardNumber:
 *           type: string
 *           example: "001095012345"
 *         allergies:
 *           type: string
 *           example: "Dị ứng Penicillin"
 *         chronicDiseases:
 *           type: string
 *           example: "Viêm xoang"
 *         emergencyContactName:
 *           type: string
 *           example: "Nguyễn Văn B (Bố)"
 *         emergencyContactPhone:
 *           type: string
 *           example: "0987654321"
 */
export const registerPatientSchema = z.object({
  email: z.string().trim().email('Email không đúng định dạng').max(100, 'Email tối đa 100 ký tự'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(50, 'Mật khẩu không được quá 50 ký tự')
    .regex(PASSWORD_REGEX, 'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'),
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên ít nhất 2 ký tự')
    .max(100, 'Họ và tên tối đa 100 ký tự'),
  phone: z
    .string()
    .trim()
    .regex(VIETNAM_PHONE_REGEX, 'Số điện thoại Việt Nam không hợp lệ')
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải có định dạng YYYY-MM-DD')
    .optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().trim().max(255, 'Địa chỉ tối đa 255 ký tự').optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  insuranceNumber: z.string().trim().max(50).optional(),
  idCardNumber: z.string().trim().max(20).optional(),
  allergies: z.string().trim().max(500).optional(),
  chronicDiseases: z.string().trim().max(500).optional(),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .trim()
    .regex(VIETNAM_PHONE_REGEX, 'Số điện thoại liên hệ khẩn cấp không hợp lệ')
    .optional(),
});

export type RegisterPatientDto = z.infer<typeof registerPatientSchema>;

/**
 * Schema đăng ký chung (backward compatibility)
 */
export const registerSchema = registerPatientSchema.extend({
  role: z.enum(['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'ADMIN']).default('PATIENT'),
});

export type RegisterDto = z.infer<typeof registerSchema>;

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
 *           example: "Patient@123"
 */
export const loginSchema = z.object({
  email: z.string().trim().email('Email không đúng định dạng'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginDto = z.infer<typeof loginSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     RefreshTokenDto:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Vui lòng cung cấp Refresh Token'),
});

export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

/**
 * @swagger
 * components:
 *   schemas:
 *     ChangePasswordDto:
 *       type: object
 *       required:
 *         - currentPassword
 *         - newPassword
 *         - confirmPassword
 *       properties:
 *         currentPassword:
 *           type: string
 *           example: "Patient@123"
 *         newPassword:
 *           type: string
 *           minLength: 6
 *           example: "NewPatient@456"
 *         confirmPassword:
 *           type: string
 *           example: "NewPatient@456"
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
      .max(50, 'Mật khẩu mới không được quá 50 ký tự')
      .regex(PASSWORD_REGEX, 'Mật khẩu mới phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại',
    path: ['newPassword'],
  });

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
