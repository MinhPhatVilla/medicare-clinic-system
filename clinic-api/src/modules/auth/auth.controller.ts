/**
 * @file src/modules/auth/auth.controller.ts
 * @description HTTP Controller cho Authentication và Phân quyền (RBAC)
 *
 * Kiến trúc: Controller chịu trách nhiệm:
 * 1. Tiếp nhận HTTP request (req.body, req.user)
 * 2. Gọi AuthService xử lý logic nghiệp vụ
 * 3. Trả dữ liệu qua ApiResponse chuẩn hóa
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ApiResponse } from '../../utils/ApiResponse';
import type { LoginDto, RegisterPatientDto, RefreshTokenDto, ChangePasswordDto } from './auth.dto';

const authService = new AuthService();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API Xác thực và Phân quyền (Authentication & RBAC)
 */
export class AuthController {
  /**
   * @swagger
   * /auth/register:
   *   post:
   *     summary: Đăng ký tài khoản dành cho bệnh nhân
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterPatientDto'
   *     responses:
   *       201:
   *         description: Đăng ký thành công, trả về thông tin user và cặp token
   *       409:
   *         description: Email đã được sử dụng trong hệ thống
   *       422:
   *         description: Dữ liệu đầu vào không hợp lệ
   */
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.registerPatient(req.body as RegisterPatientDto);
    ApiResponse.created(res, result, 'Đăng ký tài khoản bệnh nhân thành công');
  }

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Đăng nhập hệ thống (cho tất cả các vai trò)
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
   *         description: Đăng nhập thành công, trả về Access Token và Refresh Token
   *       401:
   *         description: Email hoặc mật khẩu không chính xác
   */
  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body as LoginDto);
    ApiResponse.success(res, result, 'Đăng nhập thành công');
  }

  /**
   * @swagger
   * /auth/refresh:
   *   post:
   *     summary: Làm mới Access Token (Token Rotation)
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RefreshTokenDto'
   *     responses:
   *       200:
   *         description: Làm mới token thành công, trả về cặp token mới
   *       401:
   *         description: Refresh Token không hợp lệ hoặc đã hết hạn
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const tokens = await authService.refreshToken(req.body as RefreshTokenDto);
    ApiResponse.success(res, tokens, 'Làm mới token thành công');
  }

  /**
   * @swagger
   * /auth/change-password:
   *   post:
   *     summary: Đổi mật khẩu tài khoản
   *     tags: [Auth]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/ChangePasswordDto'
   *     responses:
   *       200:
   *         description: Đổi mật khẩu thành công
   *       400:
   *         description: Mật khẩu hiện tại không chính xác
   *       401:
   *         description: Chưa xác thực token
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    await authService.changePassword(req.user!.id, req.body as ChangePasswordDto);
    ApiResponse.success(
      res,
      null,
      'Đổi mật khẩu thành công. Vui lòng đăng nhập lại trên các thiết bị khác',
    );
  }

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Lấy thông tin cá nhân của người dùng hiện tại
   *     tags: [Auth]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Lấy thông tin tài khoản thành công
   *       401:
   *         description: Chưa xác thực token
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await authService.getProfile(req.user!.id);
    ApiResponse.success(res, profile, 'Lấy thông tin tài khoản thành công');
  }

  /**
   * @swagger
   * /auth/logout:
   *   post:
   *     summary: Đăng xuất tài khoản (thu hồi Refresh Token)
   *     tags: [Auth]
   *     security:
   *       - BearerAuth: []
   *     responses:
   *       200:
   *         description: Đăng xuất thành công
   *       401:
   *         description: Chưa xác thực token
   */
  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(req.user!.id);
    ApiResponse.success(res, null, 'Đăng xuất thành công');
  }
}
