/**
 * @file src/modules/auth/auth.routes.ts
 * @description Express Router cho Auth module (Xác thực & Phân quyền)
 */

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  loginSchema,
  registerPatientSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from './auth.dto';

const router = Router();
const authController = new AuthController();

// ============================================================
// PUBLIC ROUTES (Không yêu cầu Token)
// ============================================================

// POST /api/v1/auth/register - Đăng ký tài khoản bệnh nhân
router.post('/register', validate(registerPatientSchema), (req, res) =>
  authController.register(req, res),
);

// POST /api/v1/auth/login - Đăng nhập hệ thống (PATIENT, DOCTOR, RECEPTIONIST, CASHIER, ADMIN)
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));

// POST /api/v1/auth/refresh - Làm mới Access Token (Token Rotation)
router.post('/refresh', validate(refreshTokenSchema), (req, res) =>
  authController.refresh(req, res),
);

// ============================================================
// PROTECTED ROUTES (Yêu cầu Bearer Token qua authMiddleware)
// ============================================================

// POST /api/v1/auth/change-password - Đổi mật khẩu
router.post('/change-password', authMiddleware, validate(changePasswordSchema), (req, res) =>
  authController.changePassword(req, res),
);

// GET /api/v1/auth/profile - Lấy thông tin cá nhân của user đăng nhập
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

// POST /api/v1/auth/logout - Đăng xuất tài khoản
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));

export default router;
