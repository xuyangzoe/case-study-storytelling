/**
 * Pure domain logic. No I/O, no framework — the server and the web client both
 * import these so a "low stock" badge means exactly the same thing everywhere.
 */

import { DOMAIN_CONFIG, type DomainConfig } from './config.js';
import type {
  ActivityEntry,
  ConsumptionInsight,
  DealComparison,
  ExpiryStatus,
  FoodItem,
  IsoDate,
  PurchaseRecord,
  StockStatus,
} from './types.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** Money is compared in cents, so anything under half a cent is "the same price". */
const PRICE_EPSILON = 0.005;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Midnight UTC of the calendar day a timestamp falls on. */
function startOfDay(value: Date): number {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function toDate(value: IsoDate | string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Whole calendar days from `now` until `date`. Negative once the date has passed.
 * Counting whole days keeps "expires today" at 0 regardless of time of day.
 */
export function daysUntil(date: IsoDate | Date, now: Date = new Date()): number {
  const target = toDate(date);
  if (Number.isNaN(target.getTime())) return Number.NaN;
  return Math.round((startOfDay(target) - startOfDay(now)) / MS_PER_DAY);
}

export function expiryStatus(
  expiryDate: IsoDate | null,
  now: Date = new Date(),
  config: DomainConfig = DOMAIN_CONFIG,
): ExpiryStatus {
  if (!expiryDate) return 'unknown';
  const days = daysUntil(expiryDate, now);
  if (Number.isNaN(days)) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= config.expiringSoonDays) return 'expiring_soon';
  return 'normal';
}

export function stockStatus(item: Pick<FoodItem, 'quantity' | 'lowStockThreshold'>): StockStatus {
  if (item.quantity <= 0) return 'out_of_stock';
  if (item.quantity <= item.lowStockThreshold) return 'low';
  return 'ok';
}

/**
 * Estimate how fast the household gets through an item, from the inventory
 * decreases recorded in the activity feed.
 *
 * The rate is units consumed divided by the days actually observed, so a
 * household that has only been tracking for a week still gets an estimate, and
 * a quiet week correctly drags the rate down.
 */
export function estimateConsumption(
  item: Pick<FoodItem, 'quantity'>,
  history: readonly ActivityEntry[],
  now: Date = new Date(),
  config: DomainConfig = DOMAIN_CONFIG,
): ConsumptionInsight {
  const windowStart = now.getTime() - config.consumptionWindowDays * MS_PER_DAY;

  let unitsUsed = 0;
  let sampleSize = 0;
  let earliest = Number.POSITIVE_INFINITY;

  for (const entry of history) {
    if (entry.type !== 'inventory_decreased' || entry.delta === null) continue;
    const at = toDate(entry.at).getTime();
    if (Number.isNaN(at) || at < windowStart || at > now.getTime()) continue;
    unitsUsed += Math.abs(entry.delta);
    sampleSize += 1;
    earliest = Math.min(earliest, at);
  }

  const observedDays = (now.getTime() - earliest) / MS_PER_DAY;
  const hasEnoughHistory =
    sampleSize >= config.minConsumptionSamples && unitsUsed > 0 && observedDays >= 1;

  if (!hasEnoughHistory) {
    return {
      averageDailyUsage: null,
      daysRemaining: null,
      reorderSoon: false,
      orderWithinDays: null,
      sampleSize,
    };
  }

  const averageDailyUsage = unitsUsed / observedDays;
  const daysRemaining = Math.floor(Math.max(0, item.quantity) / averageDailyUsage);
  const leadTime = config.deliveryDays + config.safetyStockDays;

  return {
    averageDailyUsage: Math.round(averageDailyUsage * 100) / 100,
    daysRemaining,
    reorderSoon: daysRemaining <= config.reorderHorizonDays,
    orderWithinDays: Math.max(0, daysRemaining - leadTime),
    sampleSize,
  };
}

export function pricePerUnit(totalPaid: number, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  return roundMoney(totalPaid / quantity);
}

/**
 * Cheapest per-unit price the household has ever paid. Ties resolve to the most
 * recent purchase so the reference price stays current.
 */
export function bestPurchase(purchases: readonly PurchaseRecord[]): PurchaseRecord | null {
  let best: PurchaseRecord | null = null;
  for (const purchase of purchases) {
    if (!best) {
      best = purchase;
      continue;
    }
    const cheaper = purchase.pricePerUnit < best.pricePerUnit - PRICE_EPSILON;
    const samePriceButNewer =
      Math.abs(purchase.pricePerUnit - best.pricePerUnit) <= PRICE_EPSILON &&
      purchase.purchasedOn > best.purchasedOn;
    if (cheaper || samePriceButNewer) best = purchase;
  }
  return best;
}

export function latestPurchase(purchases: readonly PurchaseRecord[]): PurchaseRecord | null {
  let latest: PurchaseRecord | null = null;
  for (const purchase of purchases) {
    if (!latest || purchase.purchasedOn > latest.purchasedOn) latest = purchase;
  }
  return latest;
}

/**
 * Compare an offer the shopper is looking at right now against what the
 * household has paid before (PRD §16).
 */
export function compareDeal(
  offer: { totalPrice: number; quantity: number },
  history: readonly PurchaseRecord[],
): DealComparison {
  const unitPrice = pricePerUnit(offer.totalPrice, offer.quantity);
  const previousBest = bestPurchase(history);
  // Savings are worked out from the unrounded unit price, so a $72 → $70 offer
  // reads as "$2 cheaper" rather than losing cents to per-unit rounding.
  const exactUnitPrice = offer.quantity > 0 ? offer.totalPrice / offer.quantity : 0;

  if (!previousBest) {
    return {
      verdict: 'no_history',
      pricePerUnit: unitPrice,
      previousBestPricePerUnit: null,
      savingPerUnit: null,
      savingTotal: null,
      previousBest: null,
      message: 'No purchase history yet — record this purchase to start a price reference.',
    };
  }

  const exactSavingPerUnit = previousBest.pricePerUnit - exactUnitPrice;
  const savingPerUnit = roundMoney(exactSavingPerUnit);
  const savingTotal = roundMoney(exactSavingPerUnit * offer.quantity);

  if (exactSavingPerUnit > PRICE_EPSILON) {
    return {
      verdict: 'good_deal',
      pricePerUnit: unitPrice,
      previousBestPricePerUnit: previousBest.pricePerUnit,
      savingPerUnit,
      savingTotal,
      previousBest,
      message: `${formatMoney(savingTotal)} cheaper than your previous best.`,
    };
  }

  if (exactSavingPerUnit >= -PRICE_EPSILON) {
    return {
      verdict: 'matches_best',
      pricePerUnit: unitPrice,
      previousBestPricePerUnit: previousBest.pricePerUnit,
      savingPerUnit: 0,
      savingTotal: 0,
      previousBest,
      message: 'Same as your previous best price.',
    };
  }

  return {
    verdict: 'not_best_price',
    pricePerUnit: unitPrice,
    previousBestPricePerUnit: previousBest.pricePerUnit,
    savingPerUnit,
    savingTotal,
    previousBest,
    message: `${formatMoney(Math.abs(savingTotal))} more expensive than your previous best.`,
  };
}

function formatMoney(value: number): string {
  return `$${Math.abs(value).toFixed(2)}`;
}
