/**
 * @file src/modules/auth/auth.controller.ts
 * @description HTTP Controller cho Authentication
 *
 * Kiến trúc: Controller chỉ làm 3 việc:
 * 1. Parse request (lấy data từ req.body, req.user, req.params)
 * 2. Gọi Service để xử lý business logic
 * 3. Trả response qua ApiResponse
 *
 * Controller KHÔNG chứa business logic — đó là nhiệm vụ của Service.
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type { LoginDto, RegisterDto, RefreshTokenDto } from './auth.dto';

const authService = new AuthService();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Xác thực và phân quyền
 */
export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Đăng ký tài khoản mới
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterDto'
   *     responses:
   *       201:
   *         description: Đăng ký thành công
   *       409:
   *         description: Email đã tồn tại
   */
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body as RegisterDto);
    ApiResponse.created(res, result, 'Đăng ký tài khoản thành công');
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Đăng nhập
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/LoginDto'
   *     responses:
   *       200:
   *         description: Đăng nhập thành công, trả về JWT tokens
   *       401:
   *         description: Email hoặc mật khẩu không đúng
   */
  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginDto);
    ApiResponse.success(res, result, 'Đăng nhập thành công');
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Làm mới Access Token
   *     tags: [Auth]
   *     security: []
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenDto;
    const tokens = await authService.refreshToken(refreshToken);
    ApiResponse.success(res, tokens, 'Làm mới token thành công');
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Đăng xuất
   *     tags: [Auth]
   */
  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.user!.id);
    ApiResponse.success(res, null, 'Đăng xuất thành công');
  }

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Lấy thông tin tài khoản hiện tại
   *     tags: [Auth]
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    const user = await authService.getProfile(req.user!.id);
    ApiResponse.success(res, user, 'Lấy thông tin thành công');
  }
}
