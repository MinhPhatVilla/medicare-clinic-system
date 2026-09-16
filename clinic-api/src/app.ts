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
import { initializeDatabase } from './config/database';
import { setupSwagger } from './config/swagger';
import { requestLogger } from './middlewares/logger.middleware';
import { globalErrorHandler, notFoundHandler } from './exceptions/globalErrorHandler';
import { logger } from './utils/logger';

// ---- Import Routers ----
import authRouter from './modules/auth/auth.routes';
import appointmentsRouter from './modules/appointments/appointments.routes';
import doctorsRouter from './modules/doctors/doctors.routes';
import patientsRouter from './modules/patients/patients.routes';
import examinationsRouter from './modules/examinations/examinations.routes';
import billingRouter from './modules/billing/billing.routes';
import receptionRouter from './modules/reception/reception.routes';
import serviceOrdersRouter from './modules/service-orders/service-orders.routes';
import prescriptionsRouter from './modules/prescriptions/prescriptions.routes';

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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

app.use(`${API}/auth`, authRouter);
app.use(`${API}/appointments`, appointmentsRouter);
app.use(`${API}/doctors`, doctorsRouter);
app.use(`${API}/patients`, patientsRouter);
app.use(`${API}/examinations`, examinationsRouter);
app.use(`${API}/billing`, billingRouter);
app.use(`${API}/reception`, receptionRouter);
app.use(`${API}/service-orders`, serviceOrdersRouter);
app.use(`${API}/prescriptions`, prescriptionsRouter);

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
const startServer = async (): Promise<void> => {
  try {
    // Kết nối database trước
    await initializeDatabase();

    // Khởi động HTTP server
    app.listen(env.PORT, () => {
      logger.info(`
╔════════════════════════════════════════════╗
║        MediCare Clinic API v1.0.0          ║
╠════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${env.PORT}          ║
║  📚 Docs:   http://localhost:${env.PORT}/api-docs  ║
║  ❤️  Health: http://localhost:${env.PORT}/health   ║
║  🗄️  DB:     ${env.DB_NAME}@${env.DB_HOST}:${env.DB_PORT} ║
║  🌍 Env:    ${env.NODE_ENV}                   ║
╚════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('❌ Không thể khởi động server:', error);
    process.exit(1);
  }
};

// Xử lý unhandled errors để tránh server crash đột ngột
process.on('unhandledRejection', (reason) => {
  logger.error('🔴 Unhandled Promise Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('🔴 Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export default app;
