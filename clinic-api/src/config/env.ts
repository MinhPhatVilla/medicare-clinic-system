/**
 * @file src/config/env.ts
 * @description Type-safe environment variable loader
 *
 * Kiến trúc: Sử dụng Zod để validate biến môi trường ngay khi app khởi động.
 * Nếu thiếu biến bắt buộc, app sẽ dừng và thông báo lỗi rõ ràng thay vì
 * gây lỗi runtime khó debug ở giữa chừng.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load file .env vào process.env
dotenv.config();
// Legacy timestamp columns store clinic-local wall time.
process.env.TZ = 'Asia/Ho_Chi_Minh';

// Schema định nghĩa kiểu và giá trị mặc định cho từng biến môi trường
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_SSL_CA_FILE: z.string().trim().default(''),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  DB_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SYNCHRONIZE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  DB_LOGGING: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải ít nhất 16 ký tự'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5500'),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),

  // API
  API_PREFIX: z.string().default('/api/v1'),
});

// Parse và validate — nếu lỗi sẽ throw ngay khi module được import
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Lỗi cấu hình môi trường (.env):');
  console.error(parseResult.error.format());
  process.exit(1); // Dừng app ngay lập tức
}

if (parseResult.data.NODE_ENV === 'production' && parseResult.data.DB_SYNCHRONIZE) {
  throw new Error('DB_SYNCHRONIZE must be false in production');
}
if (parseResult.data.JWT_SECRET === parseResult.data.JWT_REFRESH_SECRET) {
  throw new Error('Access and refresh secrets must differ');
}
export const env = parseResult.data;
export type Env = typeof env;
