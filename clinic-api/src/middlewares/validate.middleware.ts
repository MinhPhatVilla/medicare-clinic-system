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
import { ZodSchema, z } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Tạo middleware validate request theo Zod schema
 * @param schema - Zod schema để validate
 * @param target - Phần nào của request cần validate ('body' | 'query' | 'params')
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  const middleware = (req: Request, _res: Response, next: NextFunction): void => {
    const checkSize = (value: unknown, depth = 0): void => {
      z.number().max(8).parse(depth);
      if (typeof value === 'string') z.string().max(10000).parse(value);
      if (typeof value === 'number') z.number().finite().parse(value);
      if (Array.isArray(value)) {
        z.array(z.unknown()).max(100).parse(value);
        value.forEach((item) => checkSize(item, depth + 1));
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach((item) => checkSize(item, depth + 1));
      }
    };
    checkSize(req[target]);
    // parse() throw ZodError nếu validate thất bại
    // Global Error Handler sẽ bắt và trả về 422 tự động
    const parsed = schema.parse(req[target]);

    // Ghi đè request data với data đã được sanitize/coerce bởi Zod
    req[target] = parsed;
    next();
  };
  return Object.assign(middleware, { validation: { schema, target } });
};
