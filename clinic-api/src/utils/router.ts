import { Router } from 'express';
import { z } from 'zod';

/** All resource identifiers are validated before reaching a repository. */
export function createRouter(): Router {
  const router = Router();
  for (const name of ['id', 'appointmentId', 'examinationId', 'doctorId', 'scheduleId']) {
    router.param(name, (_req, _res, next, value) => {
      z.string().uuid().parse(value);
      next();
    });
  }
  router.param('bookingCode', (_req, _res, next, value) => {
    z.string()
      .min(1)
      .max(50)
      .regex(/^[A-Za-z0-9-]+$/)
      .parse(value);
    next();
  });
  return router;
}
