import { pricePerUnit } from '../../shared/domain.js';
import { formatMoney, formatUnits } from '../../shared/format.js';
import type { DealType, FoodItem, PurchaseRecord, User } from '../../shared/types.js';
import { recordActivity } from './activity.js';
import { newId } from './ids.js';
import type { Database } from './store.js';

/**
 * Writes one purchase to the household price history (PRD §15).
 *
 * `pricePerUnit` is computed once and stored, so history stays comparable even
 * if an item is later renamed, repackaged or deleted. Call inside `store.mutate`.
 */
export function recordPurchase(
  db: Database,
  input: {
    householdId: string;
    actor: Pick<User, 'id' | 'name'>;
    at: Date;
    foodItem: FoodItem | null;
    productName: string;
    brand: string;
    retailer: string;
    purchasedOn: string;
    quantity: number;
    regularPrice: number | null;
    totalPaid: number;
    dealType: DealType;
    notes: string;
  },
): PurchaseRecord {
  const purchase: PurchaseRecord = {
    id: newId(),
    householdId: input.householdId,
    foodItemId: input.foodItem?.id ?? null,
    productName: input.productName || input.foodItem?.name || 'Cat food',
    brand: input.brand || input.foodItem?.brand || '',
    retailer: input.retailer,
    purchasedOn: input.purchasedOn,
    quantity: input.quantity,
    regularPrice: input.regularPrice,
    totalPaid: input.totalPaid,
    pricePerUnit: pricePerUnit(input.totalPaid, input.quantity),
    dealType: input.dealType,
    notes: input.notes,
    recordedBy: input.actor.id,
    recordedByName: input.actor.name,
    createdAt: input.at.toISOString(),
  };
  db.purchases.push(purchase);

  const units = input.foodItem
    ? formatUnits(input.quantity, input.foodItem.packageType)
    : `${input.quantity} units`;
  const where = input.retailer ? ` at ${input.retailer}` : '';
  recordActivity(db, {
    householdId: input.householdId,
    type: 'purchase_recorded',
    actor: input.actor,
    summary: `${input.actor.name} recorded ${units} of ${purchase.productName} for ${formatMoney(purchase.totalPaid)}${where}`,
    foodItemId: purchase.foodItemId,
    at: input.at,
  });

  return purchase;
}

/** Today's calendar date in `YYYY-MM-DD`, used as the default purchase date. */
export function today(now: Date): string {
  return now.toISOString().slice(0, 10);
}
