import { Router } from 'express';

import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { asyncRoute } from '../errors.js';
import { buildDashboard, householdActivity } from '../views.js';

/** The "everything is under control" screen (PRD §10, §24). */
export function createDashboardRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx), requireHousehold(ctx));

  router.get(
    '/dashboard',
    asyncRoute(async (req, res) => {
      res.json({ dashboard: buildDashboard(ctx, currentHousehold(req), currentUser(req).id) });
    }),
  );

  router.get(
    '/activity',
    asyncRoute(async (req, res) => {
      const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      res.json({ activity: householdActivity(ctx, currentHousehold(req).id, limit) });
    }),
  );

  router.get(
    '/notifications',
    asyncRoute(async (req, res) => {
      const dashboard = buildDashboard(ctx, currentHousehold(req), currentUser(req).id);
      res.json({ notifications: dashboard.notifications });
    }),
  );

  return router;
}
