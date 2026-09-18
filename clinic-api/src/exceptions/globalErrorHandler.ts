/**
 * @file src/exceptions/globalErrorHandler.ts
 * @description Global Exception Filter — Xử lý lỗi tập trung
 *
 * Kiến trúc: Express nhận lỗi qua middleware 4 tham số (err, req, res, next).
 * Mọi lỗi từ bất kỳ controller/service nào đều "bubble up" đến đây.
 *
 * Điều này giúp:
 * 1. Không cần try/catch trong từng controller (nhờ express-async-errors)
 * 2. Xử lý lỗi thống nhất, dễ maintain
 * 3. Không leak stack trace ra client trong production
 */

import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';
import { AppError, ValidationError } from './AppError';
import { logger } from '../utils/logger';

export const globalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Log lỗi (luôn log trong development, chỉ log error trong production)
  if (res.headersSent) {
    next(err);
    return;
  }
  // Never log credentials, medical payloads, SQL values or bearer tokens.
  if (!(err instanceof AppError) && !(err instanceof ZodError)) {
    logger.error('Request failed', { method: req.method, errorType: err.name });
  }
  const parserError = err as Error & { type?: string };
  if (parserError.type === 'entity.parse.failed' || parserError.type === 'entity.too.large') {
    res
      .status(parserError.type === 'entity.too.large' ? 413 : 400)
      .json({ success: false, message: 'Request body khong hop le' });
    return;
  }

  // === Xử lý từng loại lỗi ===

  // 1. Lỗi nghiệp vụ tự định nghĩa (AppError)
  if (err instanceof AppError) {
    const response: Record<string, unknown> = {
      success: false,
      message: err.message,
    };

    // Nếu là ValidationError thì thêm chi tiết lỗi validate
    if (err instanceof ValidationError) {
      response.errors = err.errors;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // 2. Lỗi Zod validation (khi parse request body thất bại)
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // 3. Lỗi TypeORM (database errors)
  if (err instanceof QueryFailedError) {
    if (['23503', '23514', '23P01'].includes((err as unknown as { code: string }).code)) {
      res.status(409).json({ success: false, message: 'Du lieu vi pham rang buoc toan ven' });
      return;
    }
    if (
      ['22P02', '22003', '22007', '22008', '22001'].includes(
        (err as unknown as { code: string }).code,
      )
    ) {
      res.status(422).json({ success: false, message: 'Du lieu dau vao khong hop le' });
      return;
    }
    // Duplicate key constraint violation (PostgreSQL error code 23505)
    if ((err as unknown as { code: string }).code === '23505') {
      res.status(409).json({
        success: false,
        message: 'Dữ liệu đã tồn tại trong hệ thống',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi cơ sở dữ liệu',
    });
    return;
  }

  // 4. JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
    res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({ success: false, message: 'Token đã hết hạn' });
    return;
  }

  // 5. Lỗi không xác định (Server Error 500)
  res.status(500).json({
    success: false,
    message: 'Lỗi hệ thống nội bộ. Vui lòng thử lại sau.',
    // Chỉ hiển thị stack trace trong development để debug
  });
};

/**
 * Handler cho route không tồn tại (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Endpoint [${req.method}] ${req.path} không tồn tại`,
  });
};
