import { Router } from 'express';

import type { Cat } from '../../../shared/types.js';
import { recordActivity } from '../activity.js';
import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError, asyncRoute } from '../errors.js';
import { newId } from '../ids.js';
import { catSchema, catUpdateSchema } from '../schemas.js';
import { householdCats } from '../views.js';

/** Cat profiles (PRD §8) — the household's roster, and what food is bought for. */
export function createCatsRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx), requireHousehold(ctx));

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      res.json({ cats: householdCats(ctx, currentHousehold(req).id) });
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const input = catSchema.parse(req.body);
      const now = ctx.now();

      const cat = await ctx.store.mutate((db) => {
        const created: Cat = {
          id: newId(),
          householdId: household.id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          ...input,
        };
        db.cats.push(created);
        recordActivity(db, {
          householdId: household.id,
          type: 'cat_added',
          actor: user,
          summary: `${user.name} added ${created.name} to the household`,
          at: now,
        });
        return created;
      });

      ctx.events.broadcast(household.id, { type: 'cats:changed' });
      res.status(201).json({ cat });
    }),
  );

  router.patch(
    '/:catId',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const input = catUpdateSchema.parse(req.body);
      const existing = findCat(ctx, household.id, req.params.catId);
      const now = ctx.now();

      const cat = await ctx.store.mutate((db) => {
        const stored = db.cats.find((candidate) => candidate.id === existing.id)!;
        Object.assign(stored, input, { updatedAt: now.toISOString() });
        recordActivity(db, {
          householdId: household.id,
          type: 'cat_updated',
          actor: user,
          summary: `${user.name} updated ${stored.name}'s profile`,
          at: now,
        });
        return stored;
      });

      ctx.events.broadcast(household.id, { type: 'cats:changed' });
      res.json({ cat });
    }),
  );

  router.delete(
    '/:catId',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findCat(ctx, household.id, req.params.catId);
      const now = ctx.now();

      await ctx.store.mutate((db) => {
        db.cats = db.cats.filter((cat) => cat.id !== existing.id);
        // Food stays in the inventory; it just stops pointing at a cat that left.
        for (const item of db.foodItems) {
          if (item.householdId !== household.id) continue;
          item.catIds = item.catIds.filter((catId) => catId !== existing.id);
        }
        recordActivity(db, {
          householdId: household.id,
          type: 'cat_removed',
          actor: user,
          summary: `${user.name} removed ${existing.name}`,
          at: now,
        });
      });

      ctx.events.broadcast(household.id, { type: 'cats:changed' });
      res.status(204).end();
    }),
  );

  return router;
}

function findCat(ctx: AppContext, householdId: string, catId: string | undefined): Cat {
  const cat = ctx.store.data.cats.find(
    (candidate) => candidate.id === catId && candidate.householdId === householdId,
  );
  if (!cat) throw ApiError.notFound('Cat not found');
  return cat;
}
