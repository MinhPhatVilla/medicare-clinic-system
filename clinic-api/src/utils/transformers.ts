/**
 * @file src/utils/transformers.ts
 * @description TypeORM Value Transformers — Chuyển đổi dữ liệu giữa DB và JavaScript
 */

import { ValueTransformer } from 'typeorm';

/**
 * DecimalColumnTransformer
 * PostgreSQL & MySQL driver thường trả về kiểu string cho các cột DECIMAL / NUMERIC
 * Transformer này tự động chuyển đổi sang number khi đọc từ DB
 * và giữ nguyên giá trị number/null khi ghi vào DB.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => {
    // Preserve undefined so TypeORM can apply the database column default.
    if (value === undefined || value === null) return value;
    return Number(value);
  },
  from: (value?: string | number | null): number => {
    if (value === undefined || value === null) return 0;
    const parsed = parseFloat(value.toString());
    return isNaN(parsed) ? 0 : parsed;
  },
};
