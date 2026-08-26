import { Router } from 'express';

import type { Household, User } from '../../../shared/types.js';
import { authenticate, currentUser, signIn, signOut } from '../auth.js';
import type { AppContext } from '../context.js';
import { asyncRoute } from '../errors.js';
import { signInSchema } from '../schemas.js';

export function findHousehold(ctx: AppContext, user: User): Household | null {
  if (!user.householdId) return null;
  return ctx.store.data.households.find((h) => h.id === user.householdId) ?? null;
}

export function createAuthRouter(ctx: AppContext): Router {
  const router = Router();

  router.post(
    '/session',
    asyncRoute(async (req, res) => {
      const input = signInSchema.parse(req.body);
      const { token, user } = await signIn(ctx, input);
      res.status(201).json({ token, user, household: findHousehold(ctx, user) });
    }),
  );

  router.delete(
    '/session',
    asyncRoute(async (req, res) => {
      await signOut(ctx, req);
      res.status(204).end();
    }),
  );

  router.get(
    '/me',
    authenticate(ctx),
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      res.json({ user, household: findHousehold(ctx, user) });
    }),
  );

  return router;
}
