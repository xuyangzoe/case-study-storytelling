import { Router } from 'express';

import type { ShoppingListEntry } from '../../../shared/types.js';
import { recordActivity } from '../activity.js';
import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError, asyncRoute } from '../errors.js';
import { newId } from '../ids.js';
import { adjustInventory } from '../inventory.js';
import { recordPurchase, today } from '../purchases.js';
import { shoppingEntrySchema, shoppingPurchaseSchema } from '../schemas.js';
import { householdShoppingList } from '../views.js';

/** The shared shopping list (PRD §12) and duplicate-purchase guard (PRD §13). */
export function createShoppingRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx), requireHousehold(ctx));

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const entries = householdShoppingList(ctx, household.id);
      const status = typeof req.query.status === 'string' ? req.query.status : null;
      res.json({ entries: status ? entries.filter((entry) => entry.status === status) : entries });
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const input = shoppingEntrySchema.parse(req.body);
      const now = ctx.now();

      const linkedItem = input.foodItemId
        ? ctx.store.data.foodItems.find(
            (item) => item.id === input.foodItemId && item.householdId === household.id,
          )
        : undefined;
      if (input.foodItemId && !linkedItem) throw ApiError.notFound('Food item not found');

      const name = input.name || linkedItem?.name || '';
      const brand = input.brand || linkedItem?.brand || '';
      if (!name) throw ApiError.badRequest('What should we add to the list?');

      // PRD §13: tell the second person that someone already added it, instead
      // of silently creating a second line and inviting a duplicate purchase.
      const duplicate = findDuplicate(ctx, household.id, linkedItem?.id ?? null, name);
      if (duplicate) {
        throw ApiError.conflict('Already on the household shopping list', {
          reason: 'already_on_list',
          entry: duplicate,
        });
      }

      const entry = await ctx.store.mutate((db) => {
        const created: ShoppingListEntry = {
          id: newId(),
          householdId: household.id,
          foodItemId: linkedItem?.id ?? null,
          name,
          brand,
          note: input.note,
          status: 'needed',
          reason: input.reason,
          addedBy: user.id,
          addedByName: user.name,
          addedAt: now.toISOString(),
          purchasedBy: null,
          purchasedByName: null,
          purchasedAt: null,
        };
        db.shoppingList.push(created);
        recordActivity(db, {
          householdId: household.id,
          type: 'shopping_item_added',
          actor: user,
          summary: `${user.name} added ${name} to the shopping list`,
          foodItemId: created.foodItemId,
          at: now,
        });
        return created;
      });

      ctx.events.broadcast(household.id, { type: 'shopping:changed' });
      res.status(201).json({ entry });
    }),
  );

  /**
   * Marks a list entry as bought. Optionally restocks the linked inventory item
   * and files the price, so one action closes the shop → stock → history loop.
   */
  router.post(
    '/:entryId/purchase',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findEntry(ctx, household.id, req.params.entryId);
      const input = shoppingPurchaseSchema.parse(req.body);
      const now = ctx.now();

      if (existing.status === 'purchased') {
        throw ApiError.conflict('Already marked as purchased', {
          reason: 'already_purchased',
          entry: existing,
        });
      }

      const result = await ctx.store.mutate((db) => {
        const stored = db.shoppingList.find((entry) => entry.id === existing.id)!;
        stored.status = 'purchased';
        stored.purchasedBy = user.id;
        stored.purchasedByName = user.name;
        stored.purchasedAt = now.toISOString();

        const item = stored.foodItemId
          ? (db.foodItems.find((candidate) => candidate.id === stored.foodItemId) ?? null)
          : null;

        if (item && input.quantity > 0) {
          adjustInventory(db, {
            item,
            delta: input.quantity,
            actor: user,
            at: now,
            note: 'shopping list',
          });
        }

        recordActivity(db, {
          householdId: household.id,
          type: 'shopping_item_purchased',
          actor: user,
          summary: `${user.name} bought ${stored.name}`,
          foodItemId: stored.foodItemId,
          at: now,
        });

        const purchase =
          input.totalPaid !== null && input.quantity > 0
            ? recordPurchase(db, {
                householdId: household.id,
                actor: user,
                at: now,
                foodItem: item,
                productName: stored.name,
                brand: stored.brand,
                retailer: input.retailer,
                purchasedOn: today(now),
                quantity: input.quantity,
                regularPrice: input.regularPrice,
                totalPaid: input.totalPaid,
                dealType: input.dealType,
                notes: input.notes,
              })
            : null;

        return { entry: stored, purchase };
      });

      ctx.events.broadcast(household.id, { type: 'shopping:changed' });
      res.json(result);
    }),
  );

  router.delete(
    '/:entryId',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const existing = findEntry(ctx, household.id, req.params.entryId);
      const now = ctx.now();

      await ctx.store.mutate((db) => {
        const stored = db.shoppingList.find((entry) => entry.id === existing.id)!;
        stored.status = 'removed';
        recordActivity(db, {
          householdId: household.id,
          type: 'shopping_item_removed',
          actor: user,
          summary: `${user.name} removed ${stored.name} from the shopping list`,
          foodItemId: stored.foodItemId,
          at: now,
        });
      });

      ctx.events.broadcast(household.id, { type: 'shopping:changed' });
      res.status(204).end();
    }),
  );

  return router;
}

function findDuplicate(
  ctx: AppContext,
  householdId: string,
  foodItemId: string | null,
  name: string,
): ShoppingListEntry | null {
  const needle = name.trim().toLowerCase();
  return (
    ctx.store.data.shoppingList.find((entry) => {
      if (entry.householdId !== householdId || entry.status !== 'needed') return false;
      if (foodItemId && entry.foodItemId === foodItemId) return true;
      return entry.name.trim().toLowerCase() === needle;
    }) ?? null
  );
}

function findEntry(
  ctx: AppContext,
  householdId: string,
  entryId: string | undefined,
): ShoppingListEntry {
  const entry = ctx.store.data.shoppingList.find(
    (candidate) => candidate.id === entryId && candidate.householdId === householdId,
  );
  if (!entry) throw ApiError.notFound('Shopping list entry not found');
  return entry;
}
