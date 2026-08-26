/**
 * Tunable thresholds behind the derived views.
 *
 * They live in one place so the product can adjust "what counts as soon"
 * without hunting through the codebase.
 */
export const DOMAIN_CONFIG = {
  /** Food within this many days of its expiry date is flagged "expiring soon" (PRD §18). */
  expiringSoonDays: 30,
  /** Stock predicted to run out within this many days shows under "Reorder soon" (PRD §10). */
  reorderHorizonDays: 14,
  /** Assumed time between ordering and delivery (PRD §17). */
  deliveryDays: 3,
  /** Buffer the household wants to keep on hand on top of delivery time (PRD §17). */
  safetyStockDays: 3,
  /** Consumption history window used to estimate the daily usage rate. */
  consumptionWindowDays: 30,
  /** Minimum number of recorded consumption events before predicting anything. */
  minConsumptionSamples: 2,
  /** Fallback low-stock threshold when the package type is unknown. */
  defaultLowStockThreshold: 3,
} as const;

export type DomainConfig = typeof DOMAIN_CONFIG;

/**
 * A sensible "getting low" mark for a brand new item, so the household gets
 * useful warnings before anyone tunes anything. Counting units of the same
 * package type means six cans is low but one bag of dry food is not.
 */
export const DEFAULT_LOW_STOCK_BY_PACKAGE: Record<string, number> = {
  can: 6,
  pouch: 6,
  bag: 1,
  box: 2,
  other: DOMAIN_CONFIG.defaultLowStockThreshold,
};

export function defaultLowStockThreshold(packageType: string): number {
  return DEFAULT_LOW_STOCK_BY_PACKAGE[packageType] ?? DOMAIN_CONFIG.defaultLowStockThreshold;
}
