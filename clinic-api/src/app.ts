/**
 * @file src/app.ts
 * @description Express Application Entry Point — MediCare Clinic API
 *
 * ============================================================
 * KIẾN TRÚC MODULAR CLEAN ARCHITECTURE
 * ============================================================
 *
 * Luồng xử lý request:
 *
 *   HTTP Request
 *       ↓
 *   [Middlewares toàn cục] (Helmet, CORS, Morgan, JSON parser)
 *       ↓
 *   [Routes] (/api/v1/auth, /api/v1/appointments, ...)
 *       ↓
 *   [Route Middlewares] (authMiddleware → roleGuard → validate)
 *       ↓
 *   [Controller] (parse req → gọi Service → trả ApiResponse)
 *       ↓
 *   [Service] (business logic, gọi Repository)
 *       ↓
 *   [TypeORM Repository] (truy vấn PostgreSQL)
 *       ↓
 *   [Global Error Handler] (bắt mọi lỗi từ bất kỳ layer nào)
 *       ↓
 *   HTTP Response
 *
 * ============================================================
 */

// QUAN TRỌNG: Import reflect-metadata TRƯỚC tất cả TypeORM entities
import 'reflect-metadata';

// Import express-async-errors để tự động bắt async errors mà không cần try/catch
import 'express-async-errors';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from './config/env';

import { setupSwagger } from './config/swagger';
import { requestLogger } from './middlewares/logger.middleware';
import { globalErrorHandler, notFoundHandler } from './exceptions/globalErrorHandler';
import { apiRouters } from './routes';
import { rateLimit } from 'express-rate-limit';

// Khởi tạo Express App
const app = express();

// ============================================================
// GLOBAL MIDDLEWARES
// ============================================================

/**
 * Helmet: Tự động thêm HTTP security headers
 * Ví dụ: X-Content-Type-Options, Strict-Transport-Security, v.v.
 * Bảo vệ chống XSS, clickjacking, MIME sniffing
 */
app.use(helmet());

/**
 * CORS: Cho phép frontend (clinic-web) gọi API
 * Chỉ các origin trong CORS_ORIGIN mới được phép
 */
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Parse JSON request body (giới hạn 10mb)
app.use(express.json({ limit: '1mb' }));

// HTTP Request Logger
app.use(requestLogger);

// ============================================================
// HEALTH CHECK (không cần auth)
// ============================================================
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'MediCare Clinic API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// ============================================================
// API ROUTES
// ============================================================
const API = env.API_PREFIX; // /api/v1

app.use(API, (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(
  `${API}/auth`,
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication requests' },
  }),
);
for (const [path, router] of Object.entries(apiRouters)) app.use(`${API}/${path}`, router);

// ============================================================
// SWAGGER DOCUMENTATION
// ============================================================
setupSwagger(app);

// ============================================================
// ERROR HANDLING (PHẢI ĐẶT SAU TẤT CẢ ROUTES)
// ============================================================

// 404 handler — route không tồn tại
app.use(notFoundHandler);

// Global error handler (4 params = Express nhận biết là error handler)
app.use(globalErrorHandler);

// ============================================================
// KHỞI ĐỘNG SERVER
// ============================================================
export default app;
