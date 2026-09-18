/**
 * @file src/config/database.ts
 * @description Cấu hình TypeORM DataSource (kết nối PostgreSQL)
 *
 * Kiến trúc: TypeORM DataSource là entry point cho tất cả thao tác DB.
 * - Sử dụng "synchronize: true" trong dev để tự tạo bảng từ Entity (tiện lợi)
 * - Trong production phải dùng migrations thay vì synchronize (an toàn hơn)
 * - Tất cả Entity được import tự động qua glob pattern
 */

import { DataSource } from 'typeorm';
import { env } from './env';
import { logger } from '../utils/logger';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,

  /**
   * synchronize: true → TypeORM tự động tạo/sửa bảng dựa trên Entity
   * ⚠️ CHỈ dùng trong development, KHÔNG bao giờ dùng trong production
   *    vì có thể xóa dữ liệu hoặc làm hỏng schema
   */
  synchronize: env.DB_SYNCHRONIZE,

  // logging: true → In ra SQL query (hữu ích khi debug)
  logging: env.DB_LOGGING,

  /**
   * Entities: TypeORM sẽ quét tất cả file Entity trong thư mục models/
   * Khi thêm Entity mới, KHÔNG cần import thủ công ở đây
   */
  entities: [__dirname + '/../models/*.entity{.ts,.js}'],

  // Migrations: các file migration để quản lý schema trong production
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],

  // SSL: bật khi deploy lên cloud (Heroku, Railway, v.v.)
  ssl: env.DB_SSL ? { rejectUnauthorized: true } : false,
  extra: { max: 10, statement_timeout: 30000, options: '-c timezone=Asia/Ho_Chi_Minh' },
});

/**
 * Hàm khởi tạo kết nối database
 * Được gọi trong app.ts khi server khởi động
 */
export const initializeDatabase = async (): Promise<void> => {
  await AppDataSource.initialize();
  logger.info('PostgreSQL connected');
};
