import app from './app';
import { AppDataSource, initializeDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { Server } from 'http';

let server: Server | undefined;
let stopping = false;
async function shutdown(code: number): Promise<void> {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000);
  deadline.unref();
  try {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
    process.exitCode = code;
  } catch {
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}

process.on('SIGINT', () => {
  void shutdown(0);
});
process.on('SIGTERM', () => {
  void shutdown(0);
});
process.on('unhandledRejection', () => {
  logger.error('Unhandled rejection: shutting down');
  void shutdown(1);
});
process.on('uncaughtException', () => {
  logger.error('Uncaught exception: shutting down');
  void shutdown(1);
});

async function start(): Promise<void> {
  await initializeDatabase();
  server = app.listen(env.PORT, () =>
    logger.info(`API http://localhost:${env.PORT}; docs /api-docs`),
  );
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.on('error', () => {
    logger.error('HTTP server failed to listen');
    void shutdown(1);
  });
}
void start().catch(() => {
  logger.error('Startup failed; check database and environment configuration');
  void shutdown(1);
});
