import { Router } from 'express';

import { defaultLowStockThreshold } from '../../../shared/config.js';
import type { FoodItem, FoodItemView } from '../../../shared/types.js';
import { recordActivity } from '../activity.js';
import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError, asyncRoute } from '../errors.js';
import { newId } from '../ids.js';
import { adjustInventory } from '../inventory.js';
import { adjustSchema, foodItemSchema, foodItemUpdateSchema, foodQuerySchema } from '../schemas.js';
import { buildFoodItemViews, describeItem, findFoodItemView, sortByExpiry } from '../views.js';

/** The shared food inventory (PRD §9–§11, §14). */
export function createFoodRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx), requireHousehold(ctx));

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const query = foodQuerySchema.parse(req.query);
      const items = filterItems(buildFoodItemViews(ctx, household.id), query);
      res.json({ items: sortItems(items, query.sort) });
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const input = foodItemSchema.parse(req.body);
      const now = ctx.now();
      const catIds = validateCatIds(ctx, household.id, input.catIds);

      const created = await ctx.store.mutate((db) => {
        const item: FoodItem = {
          id: newId(),
          householdId: household.id,
          createdBy: user.id,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          ...input,
          catIds,
          lowStockThreshold: input.lowStockThreshold ?? defaultLowStockThreshold(input.packageType),
        };
        db.foodItems.push(item);

        recordActivity(db, {
          householdId: household.id,
          type: 'food_added',
          actor: user,
          summary: `${user.name} started tracking ${describeItem(item)}`,
          foodItemId: item.id,
          at: now,
        });

        // The opening count is stock the household already had, so it belongs in
        // the feed as an increase rather than appearing from nowhere.
        if (item.quantity > 0) {
          const opening = item.quantity;
          item.quantity = 0;
          adjustInventory(db, { item, delta: opening, actor: user, at: now, note: 'starting count' });
        }
        return item;
      });

      ctx.events.broadcast(household.id, { type: 'inventory:changed' });
      res.status(201).json({ item: findFoodItemView(ctx, household.id, created.id) });
    }),
  );

  router.get(
    '/:itemId',
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const item = findFoodItemView(ctx, household.id, req.params.itemId ?? '');
      if (!item) throw ApiError.notFound('Food item not found');
      res.json({ item });
    }),
  );

  router.patch(
    '/:itemId',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findItem(ctx, household.id, req.params.itemId);
      const input = foodItemUpdateSchema.parse(req.body);
      const catIds = input.catIds ? validateCatIds(ctx, household.id, input.catIds) : undefined;
      const now = ctx.now();

      await ctx.store.mutate((db) => {
        const stored = db.foodItems.find((candidate) => candidate.id === existing.id)!;
        Object.assign(stored, input, catIds ? { catIds } : {}, { updatedAt: now.toISOString() });
        recordActivity(db, {
          householdId: household.id,
          type: 'food_updated',
          actor: user,
          summary: `${user.name} updated ${describeItem(stored)}`,
          foodItemId: stored.id,
          at: now,
        });
      });

      ctx.events.broadcast(household.id, { type: 'inventory:changed' });
      res.json({ item: findFoodItemView(ctx, household.id, existing.id) });
    }),
  );

  /**
   * The fast path from PRD §11: one tap on − or + after feeding the cats.
   * Accepts a relative `delta` or an absolute `quantity` for a re-count.
   */
  router.post(
    '/:itemId/adjust',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findItem(ctx, household.id, req.params.itemId);
      const input = adjustSchema.parse(req.body);
      const now = ctx.now();

      const delta =
        input.delta !== undefined ? input.delta : (input.quantity ?? existing.quantity) - existing.quantity;

      await ctx.store.mutate((db) => {
        const stored = db.foodItems.find((candidate) => candidate.id === existing.id)!;
        adjustInventory(db, {
          item: stored,
          delta,
          actor: user,
          at: now,
          note: input.note || (input.quantity !== undefined ? 'recount' : ''),
        });
      });

      ctx.events.broadcast(household.id, { type: 'inventory:changed' });
      res.json({ item: findFoodItemView(ctx, household.id, existing.id) });
    }),
  );

  router.delete(
    '/:itemId',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findItem(ctx, household.id, req.params.itemId);
      const now = ctx.now();

      await ctx.store.mutate((db) => {
        db.foodItems = db.foodItems.filter((item) => item.id !== existing.id);
        // Purchase history is the household's price reference — it outlives the
        // inventory row and simply stops pointing at it.
        for (const purchase of db.purchases) {
          if (purchase.foodItemId === existing.id) purchase.foodItemId = null;
        }
        for (const entry of db.shoppingList) {
          if (entry.foodItemId === existing.id) entry.foodItemId = null;
        }
        recordActivity(db, {
          householdId: household.id,
          type: 'food_removed',
          actor: user,
          summary: `${user.name} stopped tracking ${describeItem(existing)}`,
          at: now,
        });
      });

      ctx.events.broadcast(household.id, { type: 'inventory:changed' });
      res.status(204).end();
    }),
  );

  return router;
}

function findItem(ctx: AppContext, householdId: string, itemId: string | undefined): FoodItem {
  const item = ctx.store.data.foodItems.find(
    (candidate) => candidate.id === itemId && candidate.householdId === householdId,
  );
  if (!item) throw ApiError.notFound('Food item not found');
  return item;
}

function validateCatIds(ctx: AppContext, householdId: string, catIds: string[]): string[] {
  const known = new Set(
    ctx.store.data.cats.filter((cat) => cat.householdId === householdId).map((cat) => cat.id),
  );
  const unknown = catIds.filter((catId) => !known.has(catId));
  if (unknown.length > 0) throw ApiError.badRequest('That cat is not in this household');
  return [...new Set(catIds)];
}

function filterItems(
  items: FoodItemView[],
  query: ReturnType<typeof foodQuerySchema.parse>,
): FoodItemView[] {
  const search = query.search?.toLowerCase();
  return items.filter((item) => {
    if (query.category && item.category !== query.category) return false;
    if (query.catId && !item.catIds.includes(query.catId)) return false;
    if (query.expiry && item.expiryStatus !== query.expiry) return false;
    if (query.stock && item.stockStatus !== query.stock) return false;
    if (search) {
      const haystack = `${item.name} ${item.brand} ${item.flavour} ${item.storageLocation}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

function sortItems(items: FoodItemView[], sort: string): FoodItemView[] {
  switch (sort) {
    case 'expiry_desc':
      return sortByExpiry(items, 'desc');
    case 'name':
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    case 'quantity':
      return [...items].sort((a, b) => a.quantity - b.quantity);
    case 'recent':
      return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    case 'expiry':
    default:
      return sortByExpiry(items, 'asc');
  }
}
