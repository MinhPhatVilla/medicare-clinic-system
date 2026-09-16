/**
 * @file src/utils/logger.ts
 * @description Winston logger — Logging chuyên nghiệp
 *
 * Kiến trúc: Sử dụng Winston thay vì console.log để:
 * - Có log levels (error, warn, info, debug)
 * - Ghi ra file trong production
 * - Format đẹp và có timestamp
 * - Dễ tích hợp với Datadog, Sentry, v.v. sau này
 */

import winston from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf, json } = winston.format;

// Format hiển thị trên console (development)
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}`;
  }),
);

// Format JSON cho production (dễ parse bởi log aggregation tools)
const prodFormat = combine(timestamp(), json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // Ghi lỗi ra file khi production
    ...(env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});
