/**
 * @file src/middlewares/roleGuard.middleware.ts
 * @description Role-based Access Control (RBAC) Middleware
 *
 * Kiến trúc: Middleware factory — nhận danh sách role được phép,
 * trả về middleware function kiểm tra role của req.user.
 *
 * Cách dùng:
 * router.post('/appointments', authMiddleware, roleGuard('PATIENT', 'RECEPTIONIST'), handler)
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.entity';
import { ForbiddenError, UnauthorizedError } from '../exceptions/AppError';

/**
 * Tạo middleware kiểm tra role
 * @param roles - Danh sách role được phép truy cập endpoint
 */
export const roleGuard = (...roles: UserRole[]) => {
  const middleware = (req: Request, _res: Response, next: NextFunction): void => {
    // authMiddleware phải chạy trước roleGuard
    if (!req.user) {
      throw new UnauthorizedError();
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Chức năng này yêu cầu role: ${roles.join(', ')}. Role của bạn: ${req.user.role}`,
      );
    }

    next();
  };
  return Object.assign(middleware, { roles });
};
