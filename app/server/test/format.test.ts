import { describe, expect, it } from 'vitest';

import { roundMoney } from '../../shared/domain.js';
import { formatDayOffset, formatDays, formatMoney, formatUnits } from '../../shared/format.js';

describe('units', () => {
  it('pluralises package types correctly', () => {
    expect(formatUnits(1, 'can')).toBe('1 can');
    expect(formatUnits(12, 'can')).toBe('12 cans');
    expect(formatUnits(1, 'pouch')).toBe('1 pouch');
    expect(formatUnits(2, 'pouch')).toBe('2 pouches');
    expect(formatUnits(1, 'box')).toBe('1 box');
    expect(formatUnits(3, 'box')).toBe('3 boxes');
    expect(formatUnits(0, 'bag')).toBe('0 bags');
    expect(formatUnits(5, 'other')).toBe('5 units');
  });
});

describe('days', () => {
  it('never says "1 days"', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(0)).toBe('0 days');
    expect(formatDays(14)).toBe('14 days');
  });

  it('reads naturally either side of today', () => {
    expect(formatDayOffset(0)).toBe('today');
    expect(formatDayOffset(1)).toBe('tomorrow');
    expect(formatDayOffset(-1)).toBe('yesterday');
    expect(formatDayOffset(19)).toBe('in 19 days');
    expect(formatDayOffset(-4)).toBe('4 days ago');
    expect(formatDayOffset(null)).toBe('');
  });
});

describe('money', () => {
  it('always shows cents, and a dash when there is nothing to show', () => {
    expect(formatMoney(3)).toBe('$3.00');
    expect(formatMoney(2.916666)).toBe('$2.92');
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
  });

  it('formats values that roundMoney has already settled', () => {
    // Prices are rounded on the way into the store, so formatting never has to
    // adjudicate a half-cent — which binary floating point would do unevenly.
    expect(formatMoney(roundMoney(70 / 24))).toBe('$2.92');
    expect(formatMoney(roundMoney(72 / 24))).toBe('$3.00');
  });
});
