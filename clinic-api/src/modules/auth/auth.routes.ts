/**
 * @file src/modules/auth/auth.routes.ts
 * @description Express Router cho Auth module
 */

import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { loginSchema, registerSchema, refreshTokenSchema } from './auth.dto';

const router = Router();
const authController = new AuthController();

// Public routes (không cần token)
router.post('/register', validate(registerSchema), (req, res) => authController.register(req, res));
router.post('/login', validate(loginSchema), (req, res) => authController.login(req, res));
router.post('/refresh', validate(refreshTokenSchema), (req, res) =>
  authController.refresh(req, res),
);

// Protected routes (cần token)
router.post('/logout', authMiddleware, (req, res) => authController.logout(req, res));
router.get('/profile', authMiddleware, (req, res) => authController.getProfile(req, res));

export default router;
