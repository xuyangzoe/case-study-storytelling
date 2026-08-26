import { describe, expect, it } from 'vitest';

import { DOMAIN_CONFIG, defaultLowStockThreshold } from '../../shared/config.js';
import {
  bestPurchase,
  compareDeal,
  daysUntil,
  estimateConsumption,
  expiryStatus,
  pricePerUnit,
  stockStatus,
} from '../../shared/domain.js';
import type { ActivityEntry, PurchaseRecord } from '../../shared/types.js';

const NOW = new Date('2026-08-26T09:00:00.000Z');

function purchase(overrides: Partial<PurchaseRecord>): PurchaseRecord {
  return {
    id: 'p1',
    householdId: 'h1',
    foodItemId: 'f1',
    productName: 'Royal Canin Chicken',
    brand: 'Royal Canin',
    retailer: 'Petbarn',
    purchasedOn: '2026-05-12',
    quantity: 24,
    regularPrice: 84,
    totalPaid: 72,
    pricePerUnit: 3,
    dealType: 'bundle',
    notes: '',
    recordedBy: 'u1',
    recordedByName: 'Yang',
    createdAt: '2026-05-12T09:00:00.000Z',
    ...overrides,
  };
}

function usage(daysAgo: number, units: number): ActivityEntry {
  return {
    id: `a-${daysAgo}`,
    householdId: 'h1',
    type: 'inventory_decreased',
    actorId: 'u1',
    actorName: 'Yang',
    summary: 'used',
    foodItemId: 'f1',
    delta: -units,
    at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
  };
}

describe('expiry', () => {
  it('counts whole calendar days regardless of time of day', () => {
    expect(daysUntil('2026-08-28', NOW)).toBe(2);
    expect(daysUntil('2026-08-26', NOW)).toBe(0);
    expect(daysUntil('2026-08-24', NOW)).toBe(-2);
  });

  it('classifies food against the expiring-soon window', () => {
    expect(expiryStatus(null, NOW)).toBe('unknown');
    expect(expiryStatus('2026-08-25', NOW)).toBe('expired');
    expect(expiryStatus('2026-08-26', NOW)).toBe('expiring_soon');
    expect(expiryStatus('2026-09-25', NOW)).toBe('expiring_soon'); // exactly 30 days
    expect(expiryStatus('2026-09-26', NOW)).toBe('normal'); // 31 days
  });

  it('keeps the boundary aligned with the configured window', () => {
    expect(DOMAIN_CONFIG.expiringSoonDays).toBe(30);
  });
});

describe('stock levels', () => {
  it('treats the threshold itself as low stock', () => {
    expect(stockStatus({ quantity: 0, lowStockThreshold: 6 })).toBe('out_of_stock');
    expect(stockStatus({ quantity: 6, lowStockThreshold: 6 })).toBe('low');
    expect(stockStatus({ quantity: 7, lowStockThreshold: 6 })).toBe('ok');
  });
});

describe('consumption and reorder prediction', () => {
  it('declines to guess without enough history', () => {
    const insight = estimateConsumption({ quantity: 20 }, [usage(3, 2)], NOW);
    expect(insight.averageDailyUsage).toBeNull();
    expect(insight.daysRemaining).toBeNull();
    expect(insight.reorderSoon).toBe(false);
  });

  it('declines to guess when every event happened on the same day', () => {
    const sameDay = [usage(0, 2), usage(0, 2), usage(0, 2)];
    expect(estimateConsumption({ quantity: 20 }, sameDay, NOW).averageDailyUsage).toBeNull();
  });

  it('divides units used by the days actually observed', () => {
    const history = [usage(10, 10), usage(5, 10)];
    const insight = estimateConsumption({ quantity: 40 }, history, NOW);
    expect(insight.averageDailyUsage).toBe(2); // 20 units over 10 observed days
    expect(insight.daysRemaining).toBe(20);
    expect(insight.sampleSize).toBe(2);
    expect(insight.reorderSoon).toBe(false);
  });

  it('reproduces the PRD reorder example: 8 days left, order within 2 days', () => {
    const history = [usage(8, 8), usage(4, 8)];
    const insight = estimateConsumption({ quantity: 16 }, history, NOW);
    expect(insight.averageDailyUsage).toBe(2); // 16 units over 8 observed days
    expect(insight.daysRemaining).toBe(8);
    expect(insight.reorderSoon).toBe(true);
    expect(insight.orderWithinDays).toBe(2); // 8 − 3 delivery − 3 safety
  });

  it('ignores increases and events outside the history window', () => {
    const restock: ActivityEntry = { ...usage(3, 24), type: 'inventory_increased', delta: 24 };
    const tooOld = usage(120, 60);
    const insight = estimateConsumption({ quantity: 10 }, [restock, tooOld, usage(6, 5), usage(2, 5)], NOW);
    expect(insight.averageDailyUsage).toBeCloseTo(10 / 6, 2);
    expect(insight.sampleSize).toBe(2);
  });

  it('never reports negative days of stock', () => {
    const insight = estimateConsumption({ quantity: 0 }, [usage(6, 5), usage(2, 5)], NOW);
    expect(insight.daysRemaining).toBe(0);
    expect(insight.orderWithinDays).toBe(0);
  });
});

describe('price history', () => {
  it('computes price per unit', () => {
    expect(pricePerUnit(72, 24)).toBe(3);
    expect(pricePerUnit(70, 24)).toBe(2.92);
    expect(pricePerUnit(10, 0)).toBe(0);
  });

  it('picks the cheapest purchase, preferring the most recent on a tie', () => {
    const cheapOld = purchase({ id: 'old', pricePerUnit: 3, purchasedOn: '2026-01-01' });
    const cheapNew = purchase({ id: 'new', pricePerUnit: 3, purchasedOn: '2026-05-12' });
    const dear = purchase({ id: 'dear', pricePerUnit: 3.5, purchasedOn: '2026-06-01' });
    expect(bestPurchase([cheapOld, dear, cheapNew])?.id).toBe('new');
    expect(bestPurchase([])).toBeNull();
  });
});

describe('deal comparison', () => {
  const history = [purchase({ pricePerUnit: 3, totalPaid: 72, quantity: 24 })];

  it('reproduces the PRD good-deal example', () => {
    const result = compareDeal({ totalPrice: 70, quantity: 24 }, history);
    expect(result.verdict).toBe('good_deal');
    expect(result.savingTotal).toBe(2);
    expect(result.message).toBe('$2.00 cheaper than your previous best.');
  });

  it('reproduces the PRD not-your-best-price example', () => {
    const result = compareDeal({ totalPrice: 84, quantity: 24 }, history);
    expect(result.verdict).toBe('not_best_price');
    expect(result.savingTotal).toBe(-12);
    expect(result.message).toBe('$12.00 more expensive than your previous best.');
  });

  it('recognises an offer that matches the previous best', () => {
    const result = compareDeal({ totalPrice: 72, quantity: 24 }, history);
    expect(result.verdict).toBe('matches_best');
    expect(result.savingTotal).toBe(0);
  });

  it('compares per unit rather than per basket', () => {
    const result = compareDeal({ totalPrice: 40, quantity: 12 }, history);
    expect(result.verdict).toBe('not_best_price'); // $3.33/can beats nothing
    expect(result.pricePerUnit).toBe(3.33);
  });

  it('says so plainly when there is no history to compare against', () => {
    const result = compareDeal({ totalPrice: 70, quantity: 24 }, []);
    expect(result.verdict).toBe('no_history');
    expect(result.previousBest).toBeNull();
  });
});

describe('low-stock defaults', () => {
  it('scales the default threshold to the package type', () => {
    expect(defaultLowStockThreshold('can')).toBe(6);
    expect(defaultLowStockThreshold('pouch')).toBe(6);
    expect(defaultLowStockThreshold('bag')).toBe(1);
    expect(defaultLowStockThreshold('box')).toBe(2);
    expect(defaultLowStockThreshold('mystery')).toBe(DOMAIN_CONFIG.defaultLowStockThreshold);
  });
});
