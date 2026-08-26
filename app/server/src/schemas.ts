import { z } from 'zod';

import { DEAL_TYPES, FOOD_CATEGORIES, PACKAGE_TYPES } from '../../shared/types.js';

const trimmed = (max: number) => z.string().trim().max(max);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Not a real date');

export const signInSchema = z.object({
  name: trimmed(60).min(1, 'Tell us your name'),
  email: trimmed(160).email('Enter a valid email address'),
});

export const createHouseholdSchema = z.object({
  name: trimmed(80).min(1, 'Give the household a name'),
});

export const joinHouseholdSchema = z.object({
  inviteCode: trimmed(12).min(4, 'Enter the invite code'),
});

export const updateHouseholdSchema = z.object({
  name: trimmed(80).min(1).optional(),
});

const stringList = z.array(trimmed(80).min(1)).max(20);

export const catSchema = z.object({
  name: trimmed(40).min(1, 'Give the cat a name'),
  photo: trimmed(200_000).nullable().default(null),
  ageYears: z.number().min(0).max(40).nullable().default(null),
  weightKg: z.number().min(0).max(40).nullable().default(null),
  mealsPerDay: z.number().int().min(0).max(12).nullable().default(null),
  preferences: stringList.default([]),
  dietaryRequirements: stringList.default([]),
  favouriteFood: trimmed(80).nullable().default(null),
  notes: trimmed(500).nullable().default(null),
});

export const catUpdateSchema = catSchema.partial();

export const foodItemSchema = z.object({
  name: trimmed(80).min(1, 'Give the food a name'),
  brand: trimmed(60).default(''),
  category: z.enum(FOOD_CATEGORIES).default('other'),
  flavour: trimmed(60).default(''),
  packageType: z.enum(PACKAGE_TYPES).default('other'),
  quantity: z.number().int().min(0).max(100_000).default(0),
  expiryDate: isoDate.nullable().default(null),
  catIds: z.array(z.string()).max(30).default([]),
  storageLocation: trimmed(60).default(''),
  notes: trimmed(500).default(''),
  /** Left optional so the server can pick a default that suits the package. */
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
});

/** Quantity changes go through `/adjust` so every change lands in the feed. */
export const foodItemUpdateSchema = foodItemSchema.omit({ quantity: true }).partial();

export const adjustSchema = z
  .object({
    delta: z.number().int().min(-100_000).max(100_000).optional(),
    quantity: z.number().int().min(0).max(100_000).optional(),
    note: trimmed(200).default(''),
  })
  .refine(
    (value) => value.delta !== undefined || value.quantity !== undefined,
    'Provide either a delta or an absolute quantity',
  )
  .refine((value) => value.delta !== 0, 'A change of zero does nothing');

export const shoppingEntrySchema = z.object({
  foodItemId: z.string().nullable().default(null),
  name: trimmed(80).default(''),
  brand: trimmed(60).default(''),
  note: trimmed(200).default(''),
  reason: z.enum(['manual', 'low_stock', 'expiring']).default('manual'),
});

export const shoppingPurchaseSchema = z.object({
  /** Units bought; added to the linked inventory item when present. */
  quantity: z.number().int().min(0).max(100_000).default(0),
  totalPaid: z.number().min(0).max(1_000_000).nullable().default(null),
  regularPrice: z.number().min(0).max(1_000_000).nullable().default(null),
  retailer: trimmed(60).default(''),
  dealType: z.enum(DEAL_TYPES).default('regular'),
  notes: trimmed(200).default(''),
});

export const purchaseSchema = z.object({
  foodItemId: z.string().nullable().default(null),
  productName: trimmed(80).default(''),
  brand: trimmed(60).default(''),
  retailer: trimmed(60).default(''),
  purchasedOn: isoDate.optional(),
  quantity: z.number().int().min(1, 'How many units did you buy?').max(100_000),
  regularPrice: z.number().min(0).max(1_000_000).nullable().default(null),
  totalPaid: z.number().min(0, 'What did it cost?').max(1_000_000),
  dealType: z.enum(DEAL_TYPES).default('regular'),
  notes: trimmed(300).default(''),
  /** Adds the purchased units to the linked inventory item. */
  addToInventory: z.boolean().default(false),
});

export const dealComparisonSchema = z.object({
  foodItemId: z.string().nullable().default(null),
  productName: trimmed(80).default(''),
  totalPrice: z.number().min(0, 'Enter the offer price').max(1_000_000),
  quantity: z.number().int().min(1, 'How many units are in the offer?').max(100_000),
});

export const foodQuerySchema = z.object({
  category: z.enum(FOOD_CATEGORIES).optional(),
  catId: z.string().optional(),
  search: trimmed(80).optional(),
  expiry: z.enum(['unknown', 'normal', 'expiring_soon', 'expired']).optional(),
  stock: z.enum(['ok', 'low', 'out_of_stock']).optional(),
  sort: z.enum(['expiry', 'expiry_desc', 'name', 'quantity', 'recent']).default('expiry'),
});
