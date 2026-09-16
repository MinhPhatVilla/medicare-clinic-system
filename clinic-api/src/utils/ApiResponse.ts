/**
 * @file src/utils/ApiResponse.ts
 * @description Chuẩn hóa format response API cho toàn bộ hệ thống
 *
 * Format chuẩn:
 * {
 *   "success": true,
 *   "message": "...",
 *   "data": { ... },
 *   "meta": { "page": 1, "total": 100, ... }
 * }
 */

import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  /**
   * Trả về response thành công
   */
  static success<T>(
    res: Response,
    data: T,
    message = 'Thành công',
    statusCode = 200,
    meta?: PaginationMeta,
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta && { meta }),
    });
  }

  /**
   * Trả về response khi tạo mới resource (201 Created)
   */
  static created<T>(res: Response, data: T, message = 'Tạo thành công'): Response {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Trả về response lỗi
   */
  static error(res: Response, message: string, statusCode = 500, errors?: unknown): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors !== undefined && { errors }),
    });
  }

  /**
   * 204 No Content — dùng khi xóa resource thành công
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
