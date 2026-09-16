/**
 * @file src/middlewares/validate.middleware.ts
 * @description Zod Validation Middleware Factory
 *
 * Kiến trúc: Middleware factory nhận Zod schema, validate req.body,
 * nếu lỗi sẽ throw ZodError để Global Error Handler xử lý.
 *
 * Cách dùng:
 * router.post('/login', validate(loginSchema), authController.login)
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Tạo middleware validate request theo Zod schema
 * @param schema - Zod schema để validate
 * @param target - Phần nào của request cần validate ('body' | 'query' | 'params')
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // parse() throw ZodError nếu validate thất bại
    // Global Error Handler sẽ bắt và trả về 422 tự động
    const parsed = schema.parse(req[target]);

    // Ghi đè request data với data đã được sanitize/coerce bởi Zod
    req[target] = parsed;
    next();
  };
};
