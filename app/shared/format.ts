/**
 * Presentation helpers shared by the server (activity summaries, notification
 * copy) and the web client (labels, badges) so both speak the same language.
 */

import type { DealType, ExpiryStatus, FoodCategory, PackageType, StockStatus } from './types.js';

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  wet_food: 'Wet food',
  dry_food: 'Dry food',
  treats: 'Treats',
  supplements: 'Supplements',
  other: 'Other',
};

export const PACKAGE_LABELS: Record<PackageType, { one: string; many: string }> = {
  can: { one: 'can', many: 'cans' },
  pouch: { one: 'pouch', many: 'pouches' },
  bag: { one: 'bag', many: 'bags' },
  box: { one: 'box', many: 'boxes' },
  other: { one: 'unit', many: 'units' },
};

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  regular: 'Regular price',
  sale: 'Sale',
  bundle: 'Bundle deal',
  subscription: 'Subscription',
  other: 'Other',
};

export const EXPIRY_LABELS: Record<ExpiryStatus, string> = {
  unknown: 'No expiry date',
  normal: 'Normal',
  expiring_soon: 'Expiring soon',
  expired: 'Expired',
};

export const STOCK_LABELS: Record<StockStatus, string> = {
  out_of_stock: 'Out of stock',
  low: 'Low stock',
  ok: 'Enough stock',
};

/** "12 cans", "1 pouch", "0 bags". */
export function formatUnits(quantity: number, packageType: PackageType): string {
  const labels = PACKAGE_LABELS[packageType];
  return `${quantity} ${Math.abs(quantity) === 1 ? labels.one : labels.many}`;
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `$${value.toFixed(2)}`;
}

/** "28 Feb 2026" — short, unambiguous, and matches the PRD mock-ups. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "1 day", "12 days" — days are counted all over the app, so pluralise once. */
export function formatDays(count: number): string {
  return `${count} ${Math.abs(count) === 1 ? 'day' : 'days'}`;
}

/** "in 12 days", "today", "3 days ago" — used next to expiry dates. */
export function formatDayOffset(days: number | null): string {
  if (days === null || Number.isNaN(days)) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${formatDays(days)}` : `${formatDays(Math.abs(days))} ago`;
}

/** "10:32 AM", "Yesterday", "3 days ago" — the activity feed timestamp. */
export function formatRelativeTime(value: string, now: Date = new Date()): string {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return '';
  const diffMs = now.getTime() - at.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (at.getTime() >= startOfToday) {
    return at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const days = Math.floor((startOfToday - at.getTime()) / 86_400_000) + 1;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(value);
}
