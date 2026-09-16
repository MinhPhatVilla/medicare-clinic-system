/**
 * @file src/middlewares/auth.middleware.ts
 * @description JWT Authentication Middleware
 *
 * Kiến trúc: Middleware này chặn request trước khi vào controller.
 * - Kiểm tra Bearer token trong Authorization header
 * - Verify token với JWT_SECRET
 * - Gán thông tin user vào req.user để controller dùng
 *
 * Cách dùng: router.get('/protected', authMiddleware, controller)
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { User } from '../models/User.entity';
import { UnauthorizedError } from '../exceptions/AppError';
import { env } from '../config/env';

// Mở rộng Express Request interface để thêm field "user"
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

interface JwtPayload {
  sub: string; // User ID
  role: string;
  iat: number;
  exp: number;
}

/**
 * Middleware xác thực JWT Token
 * Throw UnauthorizedError nếu token không hợp lệ hoặc không có
 */
export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  // Lấy token từ header "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Thiếu Authorization header');
  }

  const token = authHeader.split(' ')[1];

  // Verify token
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

  // Lấy user từ database (đảm bảo user vẫn tồn tại và còn active)
  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({
    where: { id: payload.sub, isActive: true },
  });

  if (!user) {
    throw new UnauthorizedError('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa');
  }

  // Gán user vào request để controller sử dụng
  req.user = user;
  next();
};
