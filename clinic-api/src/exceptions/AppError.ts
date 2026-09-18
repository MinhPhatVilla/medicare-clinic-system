/**
 * @file src/exceptions/AppError.ts
 * @description Custom Error class cho hệ thống
 *
 * Kiến trúc: Thay vì throw Error thông thường, tất cả lỗi nghiệp vụ
 * sẽ được throw qua AppError để Global Error Handler có thể xử lý đúng cách.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean; // true = lỗi nghiệp vụ có thể đoán trước

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Quan trọng: Cần set prototype để instanceof hoạt động đúng với TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---- Các lỗi phổ biến được định nghĩa sẵn ----

export class NotFoundError extends AppError {
  constructor(resource = 'Tài nguyên') {
    super(`${resource} không tồn tại`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Bạn chưa đăng nhập hoặc token không hợp lệ') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện hành động này') {
    super(message, 403);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ValidationError extends AppError {
  public readonly errors: unknown;

  constructor(message: string, errors: unknown) {
    super(message, 422);
    this.errors = errors;
  }
}
