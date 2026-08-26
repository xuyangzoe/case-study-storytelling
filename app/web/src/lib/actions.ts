import { useCallback } from 'react';

import { formatRelativeTime } from '../../../shared/format.js';
import type { FoodItemView, ShoppingListEntry } from '../../../shared/types.js';
import { api, ApiError } from './api.js';
import { useData, useToast } from './app-state.js';

/** Adds an item to the shared shopping list, explaining duplicates in place. */
export function useAddToShoppingList() {
  const { run } = useData();
  const { push } = useToast();

  return useCallback(
    async (item: Pick<FoodItemView, 'id' | 'name'>, reason: 'manual' | 'low_stock' = 'manual') => {
      try {
        await run(() => api.addShopping({ foodItemId: item.id, reason }), { silent: true });
        push('success', `${item.name} added to the shopping list`);
      } catch (cause) {
        push('warning', describeShoppingFailure(cause));
      }
    },
    [push, run],
  );
}

/**
 * Turns the server's duplicate conflict into the message PRD §13 asks for —
 * naming who added it and when — and leaves anything else readable.
 */
export function describeShoppingFailure(cause: unknown): string {
  if (cause instanceof ApiError && cause.status === 409) {
    const entry = (cause.details as { entry?: ShoppingListEntry } | undefined)?.entry;
    if (entry) {
      return `Already on the list — added by ${entry.addedByName} · ${formatRelativeTime(entry.addedAt)}`;
    }
  }
  return cause instanceof Error ? cause.message : 'Could not update the shopping list';
}
