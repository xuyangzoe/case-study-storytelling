import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { auth, createHarness, createHouseholdWithMember, type TestHarness } from './helpers.js';

let harness: TestHarness;

beforeEach(() => {
  harness = createHarness();
});

const api = () => request(harness.app);

async function addFood(token: string, body: Record<string, unknown>) {
  const response = await api().post('/api/food-items').set(auth(token)).send(body).expect(201);
  return response.body.item;
}

describe('access control', () => {
  it('rejects unauthenticated requests', async () => {
    await api().get('/api/dashboard').expect(401);
  });

  it('asks a signed-in user without a household to create or join one', async () => {
    const token = await harness.signIn('Yang', 'yang@example.com');
    const response = await api().get('/api/dashboard').set(auth(token)).expect(409);
    expect(response.body.code).toBe('no_household');
  });

  it('keeps one household invisible to another', async () => {
    const { token: yang } = await createHouseholdWithMember(harness);
    await addFood(yang, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 24 });

    const outsider = await harness.signIn('Sam', 'sam@example.com');
    await api().post('/api/household').set(auth(outsider)).send({ name: "Sam's" }).expect(201);

    const response = await api().get('/api/food-items').set(auth(outsider)).expect(200);
    expect(response.body.items).toHaveLength(0);
  });
});

describe('household sharing', () => {
  it('lets a second member join by invite code and see the same inventory', async () => {
    const { token: yang, household } = await createHouseholdWithMember(harness);
    await addFood(yang, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 24 });

    const partner = await harness.signIn('Partner', 'partner@example.com');
    const joined = await api()
      .post('/api/household/join')
      .set(auth(partner))
      .send({ inviteCode: household.inviteCode.toLowerCase() })
      .expect(200);
    expect(joined.body.household.members).toHaveLength(2);

    const items = await api().get('/api/food-items').set(auth(partner)).expect(200);
    expect(items.body.items[0].name).toBe('Chicken');
  });

  it('refuses an unknown invite code', async () => {
    const token = await harness.signIn('Partner', 'partner@example.com');
    await api().post('/api/household/join').set(auth(token)).send({ inviteCode: 'NOPE12' }).expect(404);
  });

  it('records who changed what', async () => {
    const { token: yang, household } = await createHouseholdWithMember(harness);
    const item = await addFood(yang, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 24 });

    const partner = await harness.signIn('Partner', 'partner@example.com');
    await api().post('/api/household/join').set(auth(partner)).send({ inviteCode: household.inviteCode }).expect(200);
    await api().post(`/api/food-items/${item.id}/adjust`).set(auth(partner)).send({ delta: -2 }).expect(200);

    const feed = await api().get('/api/activity').set(auth(yang)).expect(200);
    expect(feed.body.activity[0].summary).toBe('Partner used 2 cans of Royal Canin Chicken');
    expect(feed.body.activity[0].delta).toBe(-2);
  });
});

describe('inventory', () => {
  it('logs the opening count as an increase instead of inventing stock', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 24 });
    expect(item.quantity).toBe(24);

    const feed = await api().get('/api/activity').set(auth(token)).expect(200);
    const increase = feed.body.activity.find((entry: { type: string }) => entry.type === 'inventory_increased');
    expect(increase.delta).toBe(24);
    expect(increase.summary).toContain('starting count');
  });

  it('applies relative adjustments and never goes below zero', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', packageType: 'can', quantity: 3 });

    const decreased = await api().post(`/api/food-items/${item.id}/adjust`).set(auth(token)).send({ delta: -1 }).expect(200);
    expect(decreased.body.item.quantity).toBe(2);

    const floored = await api().post(`/api/food-items/${item.id}/adjust`).set(auth(token)).send({ delta: -10 }).expect(200);
    expect(floored.body.item.quantity).toBe(0);
    expect(floored.body.item.stockStatus).toBe('out_of_stock');
  });

  it('accepts an absolute quantity for a recount', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', packageType: 'can', quantity: 10 });

    const recount = await api().post(`/api/food-items/${item.id}/adjust`).set(auth(token)).send({ quantity: 7 }).expect(200);
    expect(recount.body.item.quantity).toBe(7);

    const feed = await api().get('/api/activity').set(auth(token)).expect(200);
    expect(feed.body.activity[0].summary).toContain('recount');
  });

  it('rejects a change of zero', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', packageType: 'can', quantity: 10 });
    await api().post(`/api/food-items/${item.id}/adjust`).set(auth(token)).send({ delta: 0 }).expect(400);
  });

  it('sorts by soonest expiry and puts undated food last', async () => {
    const { token } = await createHouseholdWithMember(harness);
    await addFood(token, { name: 'Later', packageType: 'can', quantity: 1, expiryDate: '2027-01-01' });
    await addFood(token, { name: 'Undated', packageType: 'can', quantity: 1 });
    await addFood(token, { name: 'Sooner', packageType: 'can', quantity: 1, expiryDate: '2026-09-01' });

    const response = await api().get('/api/food-items?sort=expiry').set(auth(token)).expect(200);
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(['Sooner', 'Later', 'Undated']);
    expect(response.body.items[0].expiryStatus).toBe('expiring_soon');
    expect(response.body.items[1].expiryStatus).toBe('normal');
  });

  it('filters by category, cat and search term', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const cat = await api().post('/api/cats').set(auth(token)).send({ name: 'Luna' }).expect(201);
    await addFood(token, { name: 'Chicken', category: 'wet_food', catIds: [cat.body.cat.id], packageType: 'can' });
    await addFood(token, { name: 'Kibble', category: 'dry_food', packageType: 'bag' });

    const wet = await api().get('/api/food-items?category=wet_food').set(auth(token)).expect(200);
    expect(wet.body.items).toHaveLength(1);

    const forLuna = await api().get(`/api/food-items?catId=${cat.body.cat.id}`).set(auth(token)).expect(200);
    expect(forLuna.body.items[0].cats[0].name).toBe('Luna');

    const search = await api().get('/api/food-items?search=kib').set(auth(token)).expect(200);
    expect(search.body.items[0].name).toBe('Kibble');
  });

  it('refuses to link food to a cat from another household', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const outsider = await harness.signIn('Sam', 'sam@example.com');
    await api().post('/api/household').set(auth(outsider)).send({ name: "Sam's" }).expect(201);
    const otherCat = await api().post('/api/cats').set(auth(outsider)).send({ name: 'Ghost' }).expect(201);

    await api()
      .post('/api/food-items')
      .set(auth(token))
      .send({ name: 'Chicken', catIds: [otherCat.body.cat.id] })
      .expect(400);
  });

  it('keeps price history when a food item is deleted', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', packageType: 'can', quantity: 24 });
    await api()
      .post('/api/purchases')
      .set(auth(token))
      .send({ foodItemId: item.id, productName: 'Royal Canin Chicken', quantity: 24, totalPaid: 72 })
      .expect(201);

    await api().delete(`/api/food-items/${item.id}`).set(auth(token)).expect(204);

    const purchases = await api().get('/api/purchases').set(auth(token)).expect(200);
    expect(purchases.body.purchases).toHaveLength(1);
    expect(purchases.body.purchases[0].foodItemId).toBeNull();
  });
});

describe('cats', () => {
  it('creates a profile and unlinks food when the cat is removed', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const created = await api()
      .post('/api/cats')
      .set(auth(token))
      .send({ name: 'Luna', ageYears: 3, mealsPerDay: 3, preferences: ['Wet food preferred'] })
      .expect(201);
    const catId = created.body.cat.id;

    const item = await addFood(token, { name: 'Chicken', packageType: 'can', catIds: [catId] });
    expect(item.cats[0].name).toBe('Luna');

    await api().delete(`/api/cats/${catId}`).set(auth(token)).expect(204);

    const after = await api().get(`/api/food-items/${item.id}`).set(auth(token)).expect(200);
    expect(after.body.item.catIds).toEqual([]);
  });
});

describe('shopping list', () => {
  it('stops a second member adding the same item twice', async () => {
    const { token: yang, household } = await createHouseholdWithMember(harness);
    const item = await addFood(yang, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 4 });
    await api().post('/api/shopping-list').set(auth(yang)).send({ foodItemId: item.id }).expect(201);

    const partner = await harness.signIn('Partner', 'partner@example.com');
    await api().post('/api/household/join').set(auth(partner)).send({ inviteCode: household.inviteCode }).expect(200);

    const conflict = await api()
      .post('/api/shopping-list')
      .set(auth(partner))
      .send({ foodItemId: item.id })
      .expect(409);
    expect(conflict.body.details.reason).toBe('already_on_list');
    expect(conflict.body.details.entry.addedByName).toBe('Yang');
  });

  it('catches a duplicate typed by name as well as one linked to an item', async () => {
    const { token } = await createHouseholdWithMember(harness);
    await api().post('/api/shopping-list').set(auth(token)).send({ name: 'Cat milk' }).expect(201);
    await api().post('/api/shopping-list').set(auth(token)).send({ name: '  cat MILK ' }).expect(409);
  });

  it('closes the loop: buying restocks the shelf and files the price', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can', quantity: 4 });
    const entry = await api().post('/api/shopping-list').set(auth(token)).send({ foodItemId: item.id }).expect(201);

    const purchased = await api()
      .post(`/api/shopping-list/${entry.body.entry.id}/purchase`)
      .set(auth(token))
      .send({ quantity: 24, totalPaid: 72, retailer: 'Petbarn', dealType: 'bundle' })
      .expect(200);

    expect(purchased.body.entry.status).toBe('purchased');
    expect(purchased.body.purchase.pricePerUnit).toBe(3);

    const after = await api().get(`/api/food-items/${item.id}`).set(auth(token)).expect(200);
    expect(after.body.item.quantity).toBe(28);
    expect(after.body.item.bestPricePerUnit).toBe(3);
    expect(after.body.item.onShoppingList).toBeNull();
  });

  it('will not mark the same entry purchased twice', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const entry = await api().post('/api/shopping-list').set(auth(token)).send({ name: 'Cat milk' }).expect(201);
    const url = `/api/shopping-list/${entry.body.entry.id}/purchase`;
    await api().post(url).set(auth(token)).send({}).expect(200);
    await api().post(url).set(auth(token)).send({}).expect(409);
  });
});

describe('purchases and deals', () => {
  it('compares an offer against the household price history', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', brand: 'Royal Canin', packageType: 'can' });
    await api()
      .post('/api/purchases')
      .set(auth(token))
      .send({ foodItemId: item.id, retailer: 'Petbarn', quantity: 24, totalPaid: 72, dealType: 'bundle' })
      .expect(201);

    const good = await api()
      .post('/api/purchases/compare')
      .set(auth(token))
      .send({ foodItemId: item.id, totalPrice: 70, quantity: 24 })
      .expect(200);
    expect(good.body.comparison.verdict).toBe('good_deal');
    expect(good.body.comparison.savingTotal).toBe(2);

    const bad = await api()
      .post('/api/purchases/compare')
      .set(auth(token))
      .send({ foodItemId: item.id, totalPrice: 84, quantity: 24 })
      .expect(200);
    expect(bad.body.comparison.verdict).toBe('not_best_price');
    expect(bad.body.comparison.previousBest.retailer).toBe('Petbarn');
  });

  it('optionally adds the purchased units to the shelf', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const item = await addFood(token, { name: 'Chicken', packageType: 'can', quantity: 2 });
    await api()
      .post('/api/purchases')
      .set(auth(token))
      .send({ foodItemId: item.id, quantity: 24, totalPaid: 72, addToInventory: true })
      .expect(201);

    const after = await api().get(`/api/food-items/${item.id}`).set(auth(token)).expect(200);
    expect(after.body.item.quantity).toBe(26);
  });

  it('needs a product name when the purchase is not linked to an item', async () => {
    const { token } = await createHouseholdWithMember(harness);
    await api().post('/api/purchases').set(auth(token)).send({ quantity: 24, totalPaid: 72 }).expect(400);
  });
});

describe('dashboard', () => {
  it('answers the household questions in one payload', async () => {
    const { token, household } = await createHouseholdWithMember(harness);
    await api().post('/api/cats').set(auth(token)).send({ name: 'Luna' }).expect(201);

    await addFood(token, { name: 'Tuna', brand: 'Fancy Feast', packageType: 'can', quantity: 12, expiryDate: '2026-09-10', lowStockThreshold: 6 });
    await addFood(token, { name: 'Old treats', packageType: 'box', quantity: 2, expiryDate: '2026-08-01', lowStockThreshold: 0 });
    await addFood(token, { name: 'Kibble', packageType: 'bag', quantity: 1, lowStockThreshold: 2 });

    const response = await api().get('/api/dashboard').set(auth(token)).expect(200);
    const dashboard = response.body.dashboard;

    expect(dashboard.household.id).toBe(household.id);
    expect(dashboard.totals).toMatchObject({ unitsAvailable: 15, itemsTracked: 3, catCount: 1, memberCount: 1 });
    expect(dashboard.expiringSoon.map((i: { name: string }) => i.name)).toEqual(['Tuna']);
    expect(dashboard.expired.map((i: { name: string }) => i.name)).toEqual(['Old treats']);
    expect(dashboard.lowStock.map((i: { name: string }) => i.name)).toEqual(['Kibble']);
  });

  it('raises actionable notifications and suppresses ones already handled', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const low = await addFood(token, { name: 'Kibble', packageType: 'bag', quantity: 1, lowStockThreshold: 2 });

    const before = await api().get('/api/notifications').set(auth(token)).expect(200);
    expect(before.body.notifications.some((n: { kind: string }) => n.kind === 'low_stock')).toBe(true);

    await api().post('/api/shopping-list').set(auth(token)).send({ foodItemId: low.id }).expect(201);

    const after = await api().get('/api/notifications').set(auth(token)).expect(200);
    expect(after.body.notifications.some((n: { kind: string }) => n.kind === 'low_stock')).toBe(false);
  });

  it('tells a member when someone else already added the item', async () => {
    const { token: yang, household } = await createHouseholdWithMember(harness);
    await api().post('/api/shopping-list').set(auth(yang)).send({ name: 'Royal Canin Chicken' }).expect(201);

    const partner = await harness.signIn('Partner', 'partner@example.com');
    await api().post('/api/household/join').set(auth(partner)).send({ inviteCode: household.inviteCode }).expect(200);

    const mine = await api().get('/api/notifications').set(auth(yang)).expect(200);
    expect(mine.body.notifications.some((n: { kind: string }) => n.kind === 'duplicate_purchase')).toBe(false);

    const theirs = await api().get('/api/notifications').set(auth(partner)).expect(200);
    const duplicate = theirs.body.notifications.find((n: { kind: string }) => n.kind === 'duplicate_purchase');
    expect(duplicate.title).toBe('Yang already added Royal Canin Chicken');
  });
});

describe('validation', () => {
  it('returns field-level messages', async () => {
    const { token } = await createHouseholdWithMember(harness);
    const response = await api().post('/api/food-items').set(auth(token)).send({ name: '' }).expect(400);
    expect(response.body.code).toBe('validation_failed');
    expect(response.body.details[0].field).toBe('name');
  });

  it('rejects a malformed expiry date', async () => {
    const { token } = await createHouseholdWithMember(harness);
    await api().post('/api/food-items').set(auth(token)).send({ name: 'Chicken', expiryDate: '28 Feb' }).expect(400);
  });
});
