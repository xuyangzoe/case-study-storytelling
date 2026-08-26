import { Router } from 'express';

import { compareDeal } from '../../../shared/domain.js';
import type { FoodItem, PurchaseRecord } from '../../../shared/types.js';
import { authenticate, currentHousehold, currentUser, requireHousehold } from '../auth.js';
import type { AppContext } from '../context.js';
import { ApiError, asyncRoute } from '../errors.js';
import { adjustInventory } from '../inventory.js';
import { recordPurchase, today } from '../purchases.js';
import { dealComparisonSchema, purchaseSchema } from '../schemas.js';
import { findFoodItemView, householdPurchases } from '../views.js';

/** Purchase and deal history (PRD §15) plus the deal comparison of §16. */
export function createPurchasesRouter(ctx: AppContext): Router {
  const router = Router();
  router.use(authenticate(ctx), requireHousehold(ctx));

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const foodItemId = typeof req.query.foodItemId === 'string' ? req.query.foodItemId : null;
      const all = householdPurchases(ctx, household.id);
      res.json({ purchases: foodItemId ? all.filter((p) => p.foodItemId === foodItemId) : all });
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      const user = currentUser(req);
      const household = currentHousehold(req);
      const input = purchaseSchema.parse(req.body);
      const now = ctx.now();
      const foodItem = input.foodItemId ? findItem(ctx, household.id, input.foodItemId) : null;

      if (!foodItem && !input.productName) {
        throw ApiError.badRequest('Name the product or link it to an inventory item');
      }

      const purchase = await ctx.store.mutate((db) => {
        const stored = foodItem
          ? (db.foodItems.find((candidate) => candidate.id === foodItem.id) ?? null)
          : null;

        const created = recordPurchase(db, {
          householdId: household.id,
          actor: user,
          at: now,
          foodItem: stored,
          productName: input.productName,
          brand: input.brand,
          retailer: input.retailer,
          purchasedOn: input.purchasedOn ?? today(now),
          quantity: input.quantity,
          regularPrice: input.regularPrice,
          totalPaid: input.totalPaid,
          dealType: input.dealType,
          notes: input.notes,
        });

        if (input.addToInventory && stored) {
          adjustInventory(db, {
            item: stored,
            delta: input.quantity,
            actor: user,
            at: now,
            note: 'purchase',
          });
        }
        return created;
      });

      ctx.events.broadcast(household.id, { type: 'purchases:changed' });
      res.status(201).json({
        purchase,
        item: foodItem ? findFoodItemView(ctx, household.id, foodItem.id) : null,
      });
    }),
  );

  /**
   * "Is the price on the shelf actually good?" — compares an offer against what
   * this household has paid before.
   */
  router.post(
    '/compare',
    asyncRoute(async (req, res) => {
      const household = currentHousehold(req);
      const input = dealComparisonSchema.parse(req.body);
      const history = relevantHistory(ctx, household.id, input.foodItemId, input.productName);
      res.json({ comparison: compareDeal(input, history), historyCount: history.length });
    }),
  );

  return router;
}

/**
 * History for a comparison: purchases of the linked inventory item, or — when
 * the shopper is looking at something not tracked yet — purchases whose product
 * name matches.
 */
function relevantHistory(
  ctx: AppContext,
  householdId: string,
  foodItemId: string | null,
  productName: string,
): PurchaseRecord[] {
  const all = householdPurchases(ctx, householdId);
  if (foodItemId) return all.filter((purchase) => purchase.foodItemId === foodItemId);
  const needle = productName.trim().toLowerCase();
  if (!needle) return [];
  return all.filter((purchase) => purchase.productName.trim().toLowerCase() === needle);
}

function findItem(ctx: AppContext, householdId: string, itemId: string): FoodItem {
  const item = ctx.store.data.foodItems.find(
    (candidate) => candidate.id === itemId && candidate.householdId === householdId,
  );
  if (!item) throw ApiError.notFound('Food item not found');
  return item;
}
