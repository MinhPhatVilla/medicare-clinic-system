/**
 * @file src/middlewares/logger.middleware.ts
 * @description HTTP Request Logger Middleware (dùng morgan)
 */

import morgan, { FormatFn } from 'morgan';
import { IncomingMessage, ServerResponse } from 'http';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// Tích hợp morgan stream với winston
const stream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};

// Chặn log cho health check endpoint để tránh spam log
const skipFn = (req: IncomingMessage): boolean => {
  return req.url === '/health' || req.url === '/api/health';
};

// Dùng FormatFn kiểu dev/combined thông qua morgan.token approach
// Workaround: dùng morgan.compile để lấy đúng FormatFn
const devFormat: FormatFn<IncomingMessage, ServerResponse> = morgan.compile(
  ':method :url :status :res[content-length] - :response-time ms',
);

const combinedFormat: FormatFn<IncomingMessage, ServerResponse> = morgan.compile(
  ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
);

const format = env.NODE_ENV === 'production' ? combinedFormat : devFormat;

export const requestLogger = morgan(format, {
  stream,
  skip: skipFn,
});
