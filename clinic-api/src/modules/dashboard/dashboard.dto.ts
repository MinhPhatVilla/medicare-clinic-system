import { z } from 'zod';

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Ngày không hợp lệ');

export const dashboardQuerySchema = z
  .object({
    from: dateOnly.optional(),
    to: dateOnly.optional(),
    period: z.enum(['day', 'week', 'month']).default('day'),
    doctorId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    medicineLimit: z.coerce.number().int().min(1).max(50).default(5),
  })
  .superRefine((value, context) => {
    if (Boolean(value.from) !== Boolean(value.to)) {
      context.addIssue({ code: 'custom', path: ['from'], message: 'Cần cung cấp cả from và to.' });
    }
    if (value.from && value.to) {
      const days = (Date.parse(value.to) - Date.parse(value.from)) / 86400000;
      if (days < 0 || days >= 366) {
        context.addIssue({
          code: 'custom',
          path: ['to'],
          message: 'Khoảng báo cáo phải từ 1 đến 366 ngày.',
        });
      }
    }
  });

export type DashboardQueryDto = z.infer<typeof dashboardQuerySchema>;

export function dashboardRange(query: DashboardQueryDto): { from: string; to: string } {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return { from: query.from || `${today.slice(0, 7)}-01`, to: query.to || today };
}
