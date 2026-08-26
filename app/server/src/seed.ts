/**
 * Loads a demo household that mirrors the examples in the PRD: Yang's
 * household, three cats, a stocked pantry, a month of consumption history and a
 * price reference for Royal Canin Chicken.
 *
 * Dates are generated relative to the moment the seed runs, so expiry badges and
 * reorder predictions are always meaningful. Running it replaces the data file.
 */

import { pricePerUnit } from '../../shared/domain.js';
import { formatMoney, formatUnits } from '../../shared/format.js';
import type {
  ActivityEntry,
  Cat,
  FoodItem,
  Household,
  PurchaseRecord,
  ShoppingListEntry,
  User,
} from '../../shared/types.js';
import { CONFIG } from './config.js';
import { newId } from './ids.js';
import { emptyDatabase, Store, type Database } from './store.js';

const DAY = 86_400_000;

function main(): Promise<void> {
  const now = new Date();
  const db = buildDemoDatabase(now);
  const store = Store.open(CONFIG.dataFile);
  return store.reset(db).then(() => {
    const units = db.foodItems.reduce((sum, item) => sum + item.quantity, 0);
    console.log(`[multicat] seeded ${CONFIG.dataFile}`);
    console.log(
      `[multicat] ${db.households[0]?.name}: ${db.cats.length} cats, ${db.foodItems.length} food items, ${units} units`,
    );
    console.log('[multicat] sign in as yang@example.com or partner@example.com (any name)');
  });
}

export function buildDemoDatabase(now: Date): Database {
  const db = emptyDatabase();
  const at = (daysAgo: number, hour = 9, minute = 0): Date =>
    new Date(now.getTime() - daysAgo * DAY - (24 - hour) * 3_600_000 - minute * 60_000);
  const dateOnly = (daysFromNow: number): string =>
    new Date(now.getTime() + daysFromNow * DAY).toISOString().slice(0, 10);

  const yang: User = {
    id: newId(),
    name: 'Yang',
    email: 'yang@example.com',
    householdId: null,
    createdAt: at(45).toISOString(),
  };
  const partner: User = {
    id: newId(),
    name: 'Partner',
    email: 'partner@example.com',
    householdId: null,
    createdAt: at(44).toISOString(),
  };

  const household: Household = {
    id: newId(),
    name: "Yang's Cat Household",
    inviteCode: 'LUNA26',
    members: [
      { userId: yang.id, name: yang.name, email: yang.email, role: 'owner', joinedAt: at(45).toISOString() },
      { userId: partner.id, name: partner.name, email: partner.email, role: 'member', joinedAt: at(44).toISOString() },
    ],
    createdBy: yang.id,
    createdAt: at(45).toISOString(),
  };
  yang.householdId = household.id;
  partner.householdId = household.id;
  db.users.push(yang, partner);
  db.households.push(household);

  const activity: ActivityEntry[] = [];
  const log = (input: Omit<ActivityEntry, 'id' | 'householdId'>): void => {
    activity.push({ id: newId(), householdId: household.id, ...input });
  };

  log({
    type: 'household_created',
    actorId: yang.id,
    actorName: yang.name,
    summary: `Yang created ${household.name}`,
    foodItemId: null,
    delta: null,
    at: at(45).toISOString(),
  });
  log({
    type: 'member_joined',
    actorId: partner.id,
    actorName: partner.name,
    summary: 'Partner joined the household',
    foodItemId: null,
    delta: null,
    at: at(44).toISOString(),
  });

  const makeCat = (input: Omit<Cat, 'id' | 'householdId' | 'createdAt' | 'updatedAt'>): Cat => ({
    id: newId(),
    householdId: household.id,
    createdAt: at(44).toISOString(),
    updatedAt: at(44).toISOString(),
    ...input,
  });

  const luna = makeCat({
    name: 'Luna',
    photo: '🐈',
    ageYears: 3,
    weightKg: 4.1,
    mealsPerDay: 3,
    preferences: ['Wet food preferred', 'Chicken flavour'],
    dietaryRequirements: [],
    favouriteFood: 'Royal Canin Chicken',
    notes: 'Will not touch fish.',
  });
  const milo = makeCat({
    name: 'Milo',
    photo: '🐱',
    ageYears: 5,
    weightKg: 5.6,
    mealsPerDay: 2,
    preferences: ['Dry + wet food'],
    dietaryRequirements: ['Sensitive stomach'],
    favouriteFood: "Hill's Science Diet",
    notes: 'Slow feeder bowl.',
  });
  const nala = makeCat({
    name: 'Nala',
    photo: '🐈‍⬛',
    ageYears: 1,
    weightKg: 3.2,
    mealsPerDay: 3,
    preferences: ['Pouches', 'Tuna'],
    dietaryRequirements: ['Kitten formula'],
    favouriteFood: 'Applaws Chicken Breast',
    notes: null,
  });
  db.cats.push(luna, milo, nala);

  for (const cat of db.cats) {
    log({
      type: 'cat_added',
      actorId: yang.id,
      actorName: yang.name,
      summary: `Yang added ${cat.name} to the household`,
      foodItemId: null,
      delta: null,
      at: at(44).toISOString(),
    });
  }

  interface SeedItem extends Omit<FoodItem, 'id' | 'householdId' | 'createdBy' | 'createdAt' | 'updatedAt'> {
    /** Units consumed per consumption event, and how often those happen. */
    usage?: { unitsPerEvent: number; everyDays: number; sinceDaysAgo: number };
  }

  const seedItems: SeedItem[] = [
    {
      name: 'Chicken',
      brand: 'Royal Canin',
      category: 'wet_food',
      flavour: 'Chicken',
      packageType: 'can',
      quantity: 22,
      expiryDate: dateOnly(240),
      catIds: [luna.id, milo.id],
      storageLocation: 'Pantry — top shelf',
      notes: 'The one Luna actually finishes.',
      lowStockThreshold: 12,
      usage: { unitsPerEvent: 3, everyDays: 1, sinceDaysAgo: 30 },
    },
    {
      name: 'Tuna',
      brand: 'Fancy Feast',
      category: 'wet_food',
      flavour: 'Tuna',
      packageType: 'can',
      quantity: 12,
      expiryDate: dateOnly(19),
      catIds: [nala.id],
      storageLocation: 'Pantry — top shelf',
      notes: 'Use these first.',
      lowStockThreshold: 6,
    },
    {
      name: 'Science Diet Adult',
      brand: "Hill's",
      category: 'dry_food',
      flavour: 'Chicken & rice',
      packageType: 'bag',
      quantity: 2,
      expiryDate: dateOnly(300),
      catIds: [milo.id],
      storageLocation: 'Kitchen cupboard',
      notes: '2kg bags.',
      lowStockThreshold: 2,
      usage: { unitsPerEvent: 1, everyDays: 7, sinceDaysAgo: 28 },
    },
    {
      name: 'Chicken Breast',
      brand: 'Applaws',
      category: 'wet_food',
      flavour: 'Chicken breast',
      packageType: 'pouch',
      quantity: 30,
      expiryDate: dateOnly(400),
      catIds: [nala.id, luna.id],
      storageLocation: 'Pantry — middle shelf',
      notes: '',
      lowStockThreshold: 10,
      usage: { unitsPerEvent: 2, everyDays: 2, sinceDaysAgo: 26 },
    },
    {
      name: 'Desire Tuna',
      brand: 'Dine',
      category: 'wet_food',
      flavour: 'Tuna',
      packageType: 'pouch',
      quantity: 24,
      expiryDate: dateOnly(150),
      catIds: [nala.id],
      storageLocation: 'Pantry — middle shelf',
      notes: '',
      lowStockThreshold: 8,
    },
    {
      name: 'Lamb',
      brand: 'Ziwi Peak',
      category: 'wet_food',
      flavour: 'Lamb',
      packageType: 'can',
      quantity: 18,
      expiryDate: dateOnly(500),
      catIds: [luna.id, milo.id, nala.id],
      storageLocation: 'Pantry — bottom shelf',
      notes: 'Weekend treat meal.',
      lowStockThreshold: 6,
    },
    {
      name: 'Dental Treats',
      brand: 'Greenies',
      category: 'treats',
      flavour: 'Chicken',
      packageType: 'box',
      quantity: 6,
      expiryDate: dateOnly(-4),
      catIds: [luna.id, milo.id, nala.id],
      storageLocation: 'Kitchen drawer',
      notes: 'Check these — bought in bulk last year.',
      lowStockThreshold: 2,
    },
    {
      name: 'Temptations',
      brand: 'Whiskas',
      category: 'treats',
      flavour: 'Salmon',
      packageType: 'box',
      quantity: 4,
      expiryDate: dateOnly(25),
      catIds: [milo.id],
      storageLocation: 'Kitchen drawer',
      notes: '',
      lowStockThreshold: 2,
    },
    {
      name: 'Kitten Dry',
      brand: 'Royal Canin',
      category: 'dry_food',
      flavour: 'Kitten',
      packageType: 'bag',
      quantity: 3,
      expiryDate: dateOnly(220),
      catIds: [nala.id],
      storageLocation: 'Kitchen cupboard',
      notes: '',
      lowStockThreshold: 1,
    },
    {
      name: 'Joint Support',
      brand: 'VetPlus',
      category: 'supplements',
      flavour: '',
      packageType: 'box',
      quantity: 5,
      expiryDate: dateOnly(90),
      catIds: [milo.id],
      storageLocation: 'Medicine shelf',
      notes: 'One sachet with dinner.',
      lowStockThreshold: 2,
    },
  ];

  const itemsByLabel = new Map<string, FoodItem>();

  for (const [index, seed] of seedItems.entries()) {
    const { usage, ...fields } = seed;
    const createdDaysAgo = 40 - index;
    const item: FoodItem = {
      id: newId(),
      householdId: household.id,
      createdBy: index % 2 === 0 ? yang.id : partner.id,
      createdAt: at(createdDaysAgo).toISOString(),
      updatedAt: at(createdDaysAgo).toISOString(),
      ...fields,
    };
    db.foodItems.push(item);
    itemsByLabel.set(`${item.brand} ${item.name}`, item);

    const label = item.flavour ? `${item.brand} ${item.name} (${item.flavour})` : `${item.brand} ${item.name}`;
    log({
      type: 'food_added',
      actorId: item.createdBy,
      actorName: item.createdBy === yang.id ? yang.name : partner.name,
      summary: `${item.createdBy === yang.id ? 'Yang' : 'Partner'} started tracking ${label}`,
      foodItemId: item.id,
      delta: null,
      at: at(createdDaysAgo).toISOString(),
    });

    if (!usage) continue;

    // Replay a month of feeding so the reorder prediction has real history, and
    // stock the shelves often enough to cover it.
    let restockCounter = 0;
    for (let daysAgo = usage.sinceDaysAgo; daysAgo >= 1; daysAgo -= usage.everyDays) {
      const actor = daysAgo % 2 === 0 ? yang : partner;
      log({
        type: 'inventory_decreased',
        actorId: actor.id,
        actorName: actor.name,
        summary: `${actor.name} used ${formatUnits(usage.unitsPerEvent, item.packageType)} of ${label}`,
        foodItemId: item.id,
        delta: -usage.unitsPerEvent,
        at: at(daysAgo, 18, 30).toISOString(),
      });

      restockCounter += 1;
      const restockEvery = Math.max(1, Math.round(8 / usage.everyDays));
      if (restockCounter % restockEvery === 0) {
        const units = usage.unitsPerEvent * restockEvery * 2;
        log({
          type: 'inventory_increased',
          actorId: partner.id,
          actorName: partner.name,
          summary: `Partner added ${formatUnits(units, item.packageType)} of ${label}`,
          foodItemId: item.id,
          delta: units,
          at: at(daysAgo, 11, 0).toISOString(),
        });
      }
    }
  }

  const royalCanin = itemsByLabel.get('Royal Canin Chicken')!;
  const hills = itemsByLabel.get("Hill's Science Diet Adult")!;
  const applaws = itemsByLabel.get('Applaws Chicken Breast')!;

  const purchase = (input: {
    item: FoodItem;
    retailer: string;
    daysAgo: number;
    quantity: number;
    totalPaid: number;
    regularPrice: number | null;
    dealType: PurchaseRecord['dealType'];
    notes?: string;
    actor: User;
  }): PurchaseRecord => {
    const record: PurchaseRecord = {
      id: newId(),
      householdId: household.id,
      foodItemId: input.item.id,
      productName: `${input.item.brand} ${input.item.name}`,
      brand: input.item.brand,
      retailer: input.retailer,
      purchasedOn: new Date(now.getTime() - input.daysAgo * DAY).toISOString().slice(0, 10),
      quantity: input.quantity,
      regularPrice: input.regularPrice,
      totalPaid: input.totalPaid,
      pricePerUnit: pricePerUnit(input.totalPaid, input.quantity),
      dealType: input.dealType,
      notes: input.notes ?? '',
      recordedBy: input.actor.id,
      recordedByName: input.actor.name,
      createdAt: at(input.daysAgo).toISOString(),
    };
    db.purchases.push(record);
    log({
      type: 'purchase_recorded',
      actorId: input.actor.id,
      actorName: input.actor.name,
      summary: `${input.actor.name} recorded ${formatUnits(record.quantity, input.item.packageType)} of ${record.productName} for ${formatMoney(record.totalPaid)} at ${record.retailer}`,
      foodItemId: record.foodItemId,
      delta: null,
      at: record.createdAt,
    });
    return record;
  };

  purchase({ item: royalCanin, retailer: 'Petbarn', daysAgo: 106, quantity: 24, totalPaid: 84, regularPrice: 84, dealType: 'regular', actor: yang });
  purchase({ item: royalCanin, retailer: 'Petbarn', daysAgo: 74, quantity: 24, totalPaid: 72, regularPrice: 84, dealType: 'bundle', notes: 'Bundle deal — best price so far.', actor: yang });
  purchase({ item: royalCanin, retailer: 'Woolworths', daysAgo: 31, quantity: 12, totalPaid: 42, regularPrice: 45, dealType: 'sale', actor: partner });
  purchase({ item: hills, retailer: 'PetStock', daysAgo: 52, quantity: 2, totalPaid: 63, regularPrice: 70, dealType: 'sale', actor: partner });
  purchase({ item: hills, retailer: 'Chewy', daysAgo: 20, quantity: 4, totalPaid: 118, regularPrice: 140, dealType: 'bundle', notes: 'Four-bag bundle.', actor: yang });
  purchase({ item: applaws, retailer: 'Pet Circle', daysAgo: 26, quantity: 24, totalPaid: 42, regularPrice: 48, dealType: 'sale', actor: partner });

  const shopping: ShoppingListEntry[] = [
    {
      id: newId(),
      householdId: household.id,
      foodItemId: royalCanin.id,
      name: 'Royal Canin Chicken',
      brand: 'Royal Canin',
      note: 'Running low — check the bundle price.',
      status: 'needed',
      reason: 'low_stock',
      addedBy: partner.id,
      addedByName: partner.name,
      addedAt: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
      purchasedBy: null,
      purchasedByName: null,
      purchasedAt: null,
    },
    {
      id: newId(),
      householdId: household.id,
      foodItemId: itemsByLabel.get('Whiskas Temptations')?.id ?? null,
      name: 'Whiskas Temptations',
      brand: 'Whiskas',
      note: '',
      status: 'needed',
      reason: 'manual',
      addedBy: yang.id,
      addedByName: yang.name,
      addedAt: new Date(now.getTime() - 26 * 3_600_000).toISOString(),
      purchasedBy: null,
      purchasedByName: null,
      purchasedAt: null,
    },
  ];
  db.shoppingList.push(...shopping);
  for (const entry of shopping) {
    log({
      type: 'shopping_item_added',
      actorId: entry.addedBy,
      actorName: entry.addedByName,
      summary: `${entry.addedByName} added ${entry.name} to the shopping list`,
      foodItemId: entry.foodItemId,
      delta: null,
      at: entry.addedAt,
    });
  }

  db.activity = activity.sort((a, b) => a.at.localeCompare(b.at));
  return db;
}

const isEntrypoint = process.argv[1]?.includes('seed');
if (isEntrypoint) {
  main().catch((error: unknown) => {
    console.error('[multicat] seed failed', error);
    process.exit(1);
  });
}
