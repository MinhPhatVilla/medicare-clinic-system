import { createRouter } from '../../utils/router';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { roleGuard } from '../../middlewares/roleGuard.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { UserRole } from '../../models/User.entity';
import { DashboardController } from './dashboard.controller';
import { dashboardQuerySchema } from './dashboard.dto';

const router = createRouter();
const controller = new DashboardController();
router.use(authMiddleware, roleGuard(UserRole.ADMIN, UserRole.MANAGER));
for (const name of [
  'overview',
  'revenue',
  'visits',
  'doctors',
  'diagnoses',
  'medicines',
] as const) {
  router.get(`/${name}`, validate(dashboardQuerySchema, 'query'), controller.report(name));
}
export default router;
