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

// Schema định nghĩa kiểu và giá trị mặc định cho từng biến môi trường
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SYNCHRONIZE: z.coerce.boolean().default(false),
  DB_LOGGING: z.coerce.boolean().default(false),

  // JWT
  JWT_SECRET: z.string().min(16, 'JWT_SECRET phải ít nhất 16 ký tự'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5500'),

  // Bcrypt
  BCRYPT_ROUNDS: z.coerce.number().default(12),

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

export const env = parseResult.data;
export type Env = typeof env;
