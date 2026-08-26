import { formatUnits } from '../../shared/format.js';
import type { FoodItem, User } from '../../shared/types.js';
import { recordActivity } from './activity.js';
import type { Database } from './store.js';
import { describeItem } from './views.js';

/**
 * The single place inventory quantities change.
 *
 * Every quantity change is written to the activity feed, which is what makes
 * "who used the last of it?" answerable and gives the reorder prediction its
 * consumption history. Call this inside a `store.mutate` block.
 */
export function adjustInventory(
  db: Database,
  input: {
    item: FoodItem;
    /** Signed change in units. Clamped so stock can never go negative. */
    delta: number;
    actor: Pick<User, 'id' | 'name'>;
    at: Date;
    note?: string;
  },
): { item: FoodItem; appliedDelta: number } {
  const stored = db.foodItems.find((candidate) => candidate.id === input.item.id)!;
  const nextQuantity = Math.max(0, stored.quantity + input.delta);
  const appliedDelta = nextQuantity - stored.quantity;

  stored.quantity = nextQuantity;
  stored.updatedAt = input.at.toISOString();

  if (appliedDelta !== 0) {
    const verb = appliedDelta > 0 ? 'added' : 'used';
    const units = formatUnits(Math.abs(appliedDelta), stored.packageType);
    const note = input.note ? ` (${input.note})` : '';
    recordActivity(db, {
      householdId: stored.householdId,
      type: appliedDelta > 0 ? 'inventory_increased' : 'inventory_decreased',
      actor: input.actor,
      summary: `${input.actor.name} ${verb} ${units} of ${describeItem(stored)}${note}`,
      foodItemId: stored.id,
      delta: appliedDelta,
      at: input.at,
    });
  }

  return { item: stored, appliedDelta };
}
