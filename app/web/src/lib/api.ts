/** Typed client for the MultiCat API. */

import type {
  ActivityEntry,
  Cat,
  DashboardSummary,
  DealComparison,
  FoodItemView,
  Household,
  HouseholdNotification,
  PurchaseRecord,
  ShoppingListEntry,
  User,
} from '../../../shared/types.js';

const TOKEN_KEY = 'multicat.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the failure is "you have not joined a household yet". */
  get needsHousehold(): boolean {
    return this.code === 'no_household';
  }
}

export interface FieldIssue {
  field: string;
  message: string;
}

/** Pulls field-level messages out of a validation failure for inline display. */
export function fieldIssues(error: unknown): FieldIssue[] {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') return [];
  return Array.isArray(error.details) ? (error.details as FieldIssue[]) : [];
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string | null): void => {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage can be unavailable in private windows; the session just won't persist */
    }
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...init, headers });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      response.status,
      (payload as { error?: string }).error ?? 'Something went wrong',
      (payload as { code?: string }).code ?? 'error',
      (payload as { details?: unknown }).details,
    );
  }
  return payload as T;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  signIn: (input: { name: string; email: string }) =>
    request<{ token: string; user: User; household: Household | null }>('/auth/session', {
      method: 'POST',
      body: body(input),
    }),
  signOut: () => request<void>('/auth/session', { method: 'DELETE' }),
  me: () => request<{ user: User; household: Household | null }>('/auth/me'),

  createHousehold: (input: { name: string }) =>
    request<{ household: Household }>('/household', { method: 'POST', body: body(input) }),
  joinHousehold: (input: { inviteCode: string }) =>
    request<{ household: Household }>('/household/join', { method: 'POST', body: body(input) }),
  renameHousehold: (input: { name: string }) =>
    request<{ household: Household }>('/household', { method: 'PATCH', body: body(input) }),
  rotateInviteCode: () =>
    request<{ household: Household }>('/household/invite-code', { method: 'POST' }),
  leaveHousehold: () => request<void>('/household/leave', { method: 'POST' }),

  listCats: () => request<{ cats: Cat[] }>('/cats'),
  createCat: (input: unknown) =>
    request<{ cat: Cat }>('/cats', { method: 'POST', body: body(input) }),
  updateCat: (catId: string, input: unknown) =>
    request<{ cat: Cat }>(`/cats/${catId}`, { method: 'PATCH', body: body(input) }),
  deleteCat: (catId: string) => request<void>(`/cats/${catId}`, { method: 'DELETE' }),

  listFood: (query: Record<string, string> = {}) => {
    const search = new URLSearchParams(query).toString();
    return request<{ items: FoodItemView[] }>(`/food-items${search ? `?${search}` : ''}`);
  },
  createFood: (input: unknown) =>
    request<{ item: FoodItemView }>('/food-items', { method: 'POST', body: body(input) }),
  updateFood: (itemId: string, input: unknown) =>
    request<{ item: FoodItemView }>(`/food-items/${itemId}`, { method: 'PATCH', body: body(input) }),
  adjustFood: (itemId: string, input: { delta?: number; quantity?: number; note?: string }) =>
    request<{ item: FoodItemView }>(`/food-items/${itemId}/adjust`, {
      method: 'POST',
      body: body(input),
    }),
  deleteFood: (itemId: string) => request<void>(`/food-items/${itemId}`, { method: 'DELETE' }),

  listShopping: () => request<{ entries: ShoppingListEntry[] }>('/shopping-list'),
  addShopping: (input: unknown) =>
    request<{ entry: ShoppingListEntry }>('/shopping-list', { method: 'POST', body: body(input) }),
  buyShopping: (entryId: string, input: unknown) =>
    request<{ entry: ShoppingListEntry; purchase: PurchaseRecord | null }>(
      `/shopping-list/${entryId}/purchase`,
      { method: 'POST', body: body(input) },
    ),
  removeShopping: (entryId: string) =>
    request<void>(`/shopping-list/${entryId}`, { method: 'DELETE' }),

  listPurchases: () => request<{ purchases: PurchaseRecord[] }>('/purchases'),
  recordPurchase: (input: unknown) =>
    request<{ purchase: PurchaseRecord; item: FoodItemView | null }>('/purchases', {
      method: 'POST',
      body: body(input),
    }),
  compareDeal: (input: { foodItemId: string | null; productName?: string; totalPrice: number; quantity: number }) =>
    request<{ comparison: DealComparison; historyCount: number }>('/purchases/compare', {
      method: 'POST',
      body: body(input),
    }),

  dashboard: () => request<{ dashboard: DashboardSummary }>('/dashboard'),
  activity: (limit = 100) => request<{ activity: ActivityEntry[] }>(`/activity?limit=${limit}`),
  notifications: () => request<{ notifications: HouseholdNotification[] }>('/notifications'),
};

/** Opens the live household stream. Returns a cleanup function. */
export function subscribeToHousehold(onChange: () => void): () => void {
  const token = tokenStore.get();
  if (!token) return () => {};

  const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as { type?: string };
      if (payload.type && payload.type !== 'connected') onChange();
    } catch {
      /* ignore malformed frames */
    }
  };
  // EventSource reconnects on its own; nothing to do but let it.
  source.onerror = () => {};
  return () => source.close();
}
