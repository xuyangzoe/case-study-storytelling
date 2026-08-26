import type { ActivityEntry, ActivityType, User } from '../../shared/types.js';
import { newId } from './ids.js';
import type { Database } from './store.js';

/**
 * Newest-first ordering used everywhere the activity feed is read.
 *
 * Entries are always appended in chronological order, so reversing before a
 * stable sort makes the most recently recorded entry win a timestamp tie —
 * two members adjusting the same item in the same second still read correctly.
 */
export function sortByNewest(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].reverse().sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Appends one entry to the household activity feed.
 *
 * The feed does double duty: it is the "who changed what" record from PRD §11,
 * and it is the consumption history the reorder prediction learns from.
 * Call this inside a `store.mutate` block.
 */
export function recordActivity(
  db: Database,
  input: {
    householdId: string;
    type: ActivityType;
    actor: Pick<User, 'id' | 'name'>;
    summary: string;
    foodItemId?: string | null;
    delta?: number | null;
    at: Date;
  },
): ActivityEntry {
  const entry: ActivityEntry = {
    id: newId(),
    householdId: input.householdId,
    type: input.type,
    actorId: input.actor.id,
    actorName: input.actor.name,
    summary: input.summary,
    foodItemId: input.foodItemId ?? null,
    delta: input.delta ?? null,
    at: input.at.toISOString(),
  };
  db.activity.push(entry);
  return entry;
}
