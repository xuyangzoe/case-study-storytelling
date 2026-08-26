/**
 * Read models. Raw rows come out of the store; everything the UI needs to make
 * a decision (expiry status, days of stock left, best price, shopping-list
 * state) is derived here using the shared domain rules.
 */

import { DOMAIN_CONFIG } from '../../shared/config.js';
import {
  bestPurchase,
  daysUntil,
  estimateConsumption,
  expiryStatus,
  latestPurchase,
  stockStatus,
} from '../../shared/domain.js';
import {
  CATEGORY_LABELS,
  formatDays,
  formatMoney,
  formatUnits,
  PACKAGE_LABELS,
} from '../../shared/format.js';
import type {
  ActivityEntry,
  Cat,
  DashboardSummary,
  FoodItem,
  FoodItemView,
  Household,
  HouseholdNotification,
  PurchaseRecord,
  ShoppingListEntry,
} from '../../shared/types.js';
import { sortByNewest } from './activity.js';
import type { AppContext } from './context.js';

function groupBy<T>(rows: readonly T[], key: (row: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    if (id === null) continue;
    const bucket = map.get(id);
    if (bucket) bucket.push(row);
    else map.set(id, [row]);
  }
  return map;
}

export function householdCats(ctx: AppContext, householdId: string): Cat[] {
  return ctx.store.data.cats
    .filter((cat) => cat.householdId === householdId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function householdPurchases(ctx: AppContext, householdId: string): PurchaseRecord[] {
  return ctx.store.data.purchases
    .filter((purchase) => purchase.householdId === householdId)
    .sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn) || b.createdAt.localeCompare(a.createdAt));
}

export function householdShoppingList(ctx: AppContext, householdId: string): ShoppingListEntry[] {
  return ctx.store.data.shoppingList
    .filter((entry) => entry.householdId === householdId && entry.status !== 'removed')
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function householdActivity(
  ctx: AppContext,
  householdId: string,
  limit?: number,
): ActivityEntry[] {
  const entries = sortByNewest(
    ctx.store.data.activity.filter((entry) => entry.householdId === householdId),
  );
  return limit === undefined ? entries : entries.slice(0, limit);
}

export function buildFoodItemViews(ctx: AppContext, householdId: string): FoodItemView[] {
  const now = ctx.now();
  const items = ctx.store.data.foodItems.filter((item) => item.householdId === householdId);
  const cats = new Map(householdCats(ctx, householdId).map((cat) => [cat.id, cat]));

  const historyByItem = groupBy(
    ctx.store.data.activity.filter((entry) => entry.householdId === householdId),
    (entry) => entry.foodItemId,
  );
  const purchasesByItem = groupBy(
    ctx.store.data.purchases.filter((purchase) => purchase.householdId === householdId),
    (purchase) => purchase.foodItemId,
  );
  const shoppingByItem = groupBy(
    householdShoppingList(ctx, householdId).filter((entry) => entry.status === 'needed'),
    (entry) => entry.foodItemId,
  );

  return items.map((item) => toView(item, { now, cats, historyByItem, purchasesByItem, shoppingByItem }));
}

function toView(
  item: FoodItem,
  deps: {
    now: Date;
    cats: Map<string, Cat>;
    historyByItem: Map<string, ActivityEntry[]>;
    purchasesByItem: Map<string, PurchaseRecord[]>;
    shoppingByItem: Map<string, ShoppingListEntry[]>;
  },
): FoodItemView {
  const history = deps.historyByItem.get(item.id) ?? [];
  const purchases = deps.purchasesByItem.get(item.id) ?? [];
  const best = bestPurchase(purchases);

  return {
    ...item,
    expiryStatus: expiryStatus(item.expiryDate, deps.now),
    daysUntilExpiry: item.expiryDate ? daysUntil(item.expiryDate, deps.now) : null,
    stockStatus: stockStatus(item),
    cats: item.catIds
      .map((catId) => deps.cats.get(catId))
      .filter((cat): cat is Cat => Boolean(cat))
      .map((cat) => ({ id: cat.id, name: cat.name, photo: cat.photo })),
    consumption: estimateConsumption(item, history, deps.now),
    bestPricePerUnit: best?.pricePerUnit ?? null,
    lastPurchase: latestPurchase(purchases),
    onShoppingList: deps.shoppingByItem.get(item.id)?.[0] ?? null,
  };
}

export function findFoodItemView(
  ctx: AppContext,
  householdId: string,
  itemId: string,
): FoodItemView | null {
  return buildFoodItemViews(ctx, householdId).find((item) => item.id === itemId) ?? null;
}

/** Soonest expiry first; items without a date sort last (PRD §14). */
export function sortByExpiry(items: FoodItemView[], direction: 'asc' | 'desc' = 'asc'): FoodItemView[] {
  return [...items].sort((a, b) => {
    if (a.expiryDate === b.expiryDate) return a.name.localeCompare(b.name);
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return direction === 'asc'
      ? a.expiryDate.localeCompare(b.expiryDate)
      : b.expiryDate.localeCompare(a.expiryDate);
  });
}

/**
 * Actionable notifications only (PRD §18). Each one names a thing the household
 * can do something about right now, and is ordered by how soon it matters.
 */
export function buildNotifications(
  items: FoodItemView[],
  shoppingList: ShoppingListEntry[],
  viewerId: string,
): HouseholdNotification[] {
  const notifications: HouseholdNotification[] = [];

  for (const item of items) {
    const label = `${item.brand} ${item.name}`.trim();

    if (item.stockStatus !== 'ok' && !item.onShoppingList) {
      notifications.push({
        id: `low_stock:${item.id}`,
        kind: 'low_stock',
        title: `${label} is running low`,
        body:
          item.quantity <= 0
            ? 'None left in the household.'
            : `Only ${formatUnits(item.quantity, item.packageType)} left.`,
        foodItemId: item.id,
        priority: 1,
      });
    }

    if (item.expiryStatus === 'expired') {
      notifications.push({
        id: `expiry:${item.id}`,
        kind: 'expiry',
        title: `${label} has expired`,
        body: `${formatUnits(item.quantity, item.packageType)} expired ${formatDays(Math.abs(item.daysUntilExpiry ?? 0))} ago.`,
        foodItemId: item.id,
        priority: 1,
      });
    } else if (item.expiryStatus === 'expiring_soon') {
      notifications.push({
        id: `expiry:${item.id}`,
        kind: 'expiry',
        title: `${formatUnits(item.quantity, item.packageType)} of ${label} expire soon`,
        body: `Use these first — they expire in ${formatDays(item.daysUntilExpiry ?? 0)}.`,
        foodItemId: item.id,
        priority: (item.daysUntilExpiry ?? 0) <= 7 ? 1 : 2,
      });
    }

    if (item.consumption.reorderSoon && !item.onShoppingList) {
      const within = item.consumption.orderWithinDays ?? 0;
      notifications.push({
        id: `reorder:${item.id}`,
        kind: 'reorder',
        title: `Time to reorder ${label}`,
        body:
          within === 0
            ? `About ${formatDays(item.consumption.daysRemaining ?? 0)} of stock left — order now to cover delivery time.`
            : `About ${formatDays(item.consumption.daysRemaining ?? 0)} of stock left — order within the next ${formatDays(within)}.`,
        foodItemId: item.id,
        priority: 2,
      });
    }

    if (item.onShoppingList && item.bestPricePerUnit !== null) {
      const unit = PACKAGE_LABELS[item.packageType].one;
      notifications.push({
        id: `deal:${item.id}`,
        kind: 'deal',
        title: `${label}: your best price is ${formatMoney(item.bestPricePerUnit)} per ${unit}`,
        body: item.lastPurchase?.retailer
          ? `Last bought at ${item.lastPurchase.retailer}. Compare before you buy.`
          : 'Compare the current offer before you buy.',
        foodItemId: item.id,
        priority: 3,
      });
    }
  }

  for (const entry of shoppingList) {
    if (entry.status !== 'needed' || entry.addedBy === viewerId) continue;
    notifications.push({
      id: `duplicate:${entry.id}`,
      kind: 'duplicate_purchase',
      title: `${entry.addedByName} already added ${entry.name}`,
      body: 'It is on the household shopping list — no need to buy it twice.',
      foodItemId: entry.foodItemId,
      priority: 3,
    });
  }

  return notifications.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title));
}

export function buildDashboard(
  ctx: AppContext,
  household: Household,
  viewerId: string,
): DashboardSummary {
  const items = buildFoodItemViews(ctx, household.id);
  const shoppingList = householdShoppingList(ctx, household.id);
  const purchases = householdPurchases(ctx, household.id);

  const bestByItem = new Map<string, PurchaseRecord>();
  for (const purchase of purchases) {
    const key = purchase.foodItemId ?? `ad-hoc:${purchase.productName.toLowerCase()}`;
    const current = bestByItem.get(key);
    if (!current || purchase.pricePerUnit < current.pricePerUnit) bestByItem.set(key, purchase);
  }

  const recentDeals = [...bestByItem.values()]
    .sort((a, b) => b.purchasedOn.localeCompare(a.purchasedOn))
    .slice(0, 4)
    .map((purchase) => ({
      foodItemId: purchase.foodItemId,
      name: purchase.productName,
      brand: purchase.brand,
      purchase,
    }));

  return {
    household,
    totals: {
      unitsAvailable: items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0),
      itemsTracked: items.length,
      catCount: householdCats(ctx, household.id).length,
      memberCount: household.members.length,
    },
    expiringSoon: sortByExpiry(items.filter((item) => item.expiryStatus === 'expiring_soon')),
    expired: sortByExpiry(items.filter((item) => item.expiryStatus === 'expired')),
    lowStock: items
      .filter((item) => item.stockStatus !== 'ok')
      .sort((a, b) => a.quantity - b.quantity),
    reorderSoon: items
      .filter((item) => item.consumption.reorderSoon)
      .sort((a, b) => (a.consumption.daysRemaining ?? 0) - (b.consumption.daysRemaining ?? 0)),
    recentDeals,
    shoppingList: shoppingList.filter((entry) => entry.status === 'needed'),
    recentActivity: householdActivity(ctx, household.id, 12),
    notifications: buildNotifications(items, shoppingList, viewerId),
  };
}

/** Used in activity summaries: "24 cans of Royal Canin Chicken (Wet food)". */
export function describeItem(item: FoodItem): string {
  const name = `${item.brand} ${item.name}`.trim();
  return item.flavour ? `${name} (${item.flavour})` : name;
}

export const CATEGORY_LABEL_LOOKUP = CATEGORY_LABELS;
export const DEFAULT_LOW_STOCK_THRESHOLD = DOMAIN_CONFIG.defaultLowStockThreshold;
