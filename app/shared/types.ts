/**
 * Domain types shared by the server and the web client.
 *
 * The vocabulary follows the PRD: a Household is the shared workspace, it owns
 * Cats, one shared Food inventory, a Shopping List, and a Purchase history.
 */

export type Id = string;
/** Calendar date, `YYYY-MM-DD`. Expiry dates have no meaningful time-of-day. */
export type IsoDate = string;
/** Instant, full ISO-8601 string. */
export type IsoDateTime = string;

export const FOOD_CATEGORIES = ['wet_food', 'dry_food', 'treats', 'supplements', 'other'] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const PACKAGE_TYPES = ['can', 'pouch', 'bag', 'box', 'other'] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const DEAL_TYPES = ['regular', 'sale', 'bundle', 'subscription', 'other'] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export type MemberRole = 'owner' | 'member';

export interface User {
  id: Id;
  name: string;
  email: string;
  householdId: Id | null;
  createdAt: IsoDateTime;
}

/** A user as seen from inside a household. */
export interface HouseholdMember {
  userId: Id;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: IsoDateTime;
}

export interface Household {
  id: Id;
  name: string;
  /** Short human-shareable code used to join the household. */
  inviteCode: string;
  members: HouseholdMember[];
  createdBy: Id;
  createdAt: IsoDateTime;
}

export interface Cat {
  id: Id;
  householdId: Id;
  name: string;
  /** Emoji or image data URL used as the profile photo. */
  photo: string | null;
  ageYears: number | null;
  weightKg: number | null;
  mealsPerDay: number | null;
  /** Free-form preferences, e.g. "Wet food preferred", "Chicken flavour". */
  preferences: string[];
  /** Free-form dietary requirements, e.g. "Sensitive stomach". */
  dietaryRequirements: string[];
  favouriteFood: string | null;
  notes: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface FoodItem {
  id: Id;
  householdId: Id;
  name: string;
  brand: string;
  category: FoodCategory;
  flavour: string;
  packageType: PackageType;
  /** Units currently in the household, counted in `packageType` units. */
  quantity: number;
  expiryDate: IsoDate | null;
  /** Cats this food is bought for. Empty means "any cat in the household". */
  catIds: Id[];
  storageLocation: string;
  notes: string;
  /** At or below this many units the item counts as low stock. */
  lowStockThreshold: number;
  createdBy: Id;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type ActivityType =
  | 'household_created'
  | 'member_joined'
  | 'cat_added'
  | 'cat_updated'
  | 'cat_removed'
  | 'food_added'
  | 'food_updated'
  | 'food_removed'
  | 'inventory_increased'
  | 'inventory_decreased'
  | 'shopping_item_added'
  | 'shopping_item_purchased'
  | 'shopping_item_removed'
  | 'purchase_recorded';

/** One entry of the household activity feed; also the consumption history. */
export interface ActivityEntry {
  id: Id;
  householdId: Id;
  type: ActivityType;
  actorId: Id;
  actorName: string;
  /** Human-readable summary, e.g. "Yang added 24 cans of Royal Canin Chicken". */
  summary: string;
  foodItemId: Id | null;
  /** Signed quantity change for inventory events, otherwise null. */
  delta: number | null;
  at: IsoDateTime;
}

export type ShoppingStatus = 'needed' | 'purchased' | 'removed';
export type ShoppingReason = 'manual' | 'low_stock' | 'expiring';

export interface ShoppingListEntry {
  id: Id;
  householdId: Id;
  /** Set when the entry restocks an item already tracked in the inventory. */
  foodItemId: Id | null;
  name: string;
  brand: string;
  note: string;
  status: ShoppingStatus;
  reason: ShoppingReason;
  addedBy: Id;
  addedByName: string;
  addedAt: IsoDateTime;
  purchasedBy: Id | null;
  purchasedByName: string | null;
  purchasedAt: IsoDateTime | null;
}

export interface PurchaseRecord {
  id: Id;
  householdId: Id;
  foodItemId: Id | null;
  productName: string;
  brand: string;
  retailer: string;
  purchasedOn: IsoDate;
  /** Units bought, in the food item's package units. */
  quantity: number;
  /** Usual shelf price for the same quantity, when known. */
  regularPrice: number | null;
  /** What the household actually paid. */
  totalPaid: number;
  /** Derived: totalPaid / quantity. Stored so history stays stable. */
  pricePerUnit: number;
  dealType: DealType;
  notes: string;
  recordedBy: Id;
  recordedByName: string;
  createdAt: IsoDateTime;
}

/* ------------------------------------------------------------------ */
/* Derived read models                                                 */
/* ------------------------------------------------------------------ */

export type ExpiryStatus = 'unknown' | 'normal' | 'expiring_soon' | 'expired';
export type StockStatus = 'out_of_stock' | 'low' | 'ok';

export interface ConsumptionInsight {
  /** Average units consumed per day, or null when history is too thin. */
  averageDailyUsage: number | null;
  /** Whole days of stock left at the current rate, or null when unknown. */
  daysRemaining: number | null;
  /** True once `daysRemaining` falls inside the reorder horizon. */
  reorderSoon: boolean;
  /** Days the household can still wait before ordering. Null when unknown. */
  orderWithinDays: number | null;
  /** Number of consumption events the estimate is based on. */
  sampleSize: number;
}

/** A food item plus everything the UI needs to render it. */
export interface FoodItemView extends FoodItem {
  expiryStatus: ExpiryStatus;
  daysUntilExpiry: number | null;
  stockStatus: StockStatus;
  cats: Array<Pick<Cat, 'id' | 'name' | 'photo'>>;
  consumption: ConsumptionInsight;
  bestPricePerUnit: number | null;
  lastPurchase: PurchaseRecord | null;
  onShoppingList: ShoppingListEntry | null;
}

export type DealVerdict = 'good_deal' | 'matches_best' | 'not_best_price' | 'no_history';

export interface DealComparison {
  verdict: DealVerdict;
  pricePerUnit: number;
  previousBestPricePerUnit: number | null;
  /** Positive when the offer is cheaper than the previous best. */
  savingPerUnit: number | null;
  /** Positive when the offer is cheaper across the whole quantity. */
  savingTotal: number | null;
  previousBest: PurchaseRecord | null;
  message: string;
}

export type NotificationKind = 'low_stock' | 'expiry' | 'reorder' | 'duplicate_purchase' | 'deal';

export interface HouseholdNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  foodItemId: Id | null;
  /** Ordering hint: 1 needs attention now, 3 is informational. */
  priority: 1 | 2 | 3;
}

export interface DashboardSummary {
  household: Household;
  totals: {
    /** Total units across every tracked food item. */
    unitsAvailable: number;
    itemsTracked: number;
    catCount: number;
    memberCount: number;
  };
  expiringSoon: FoodItemView[];
  expired: FoodItemView[];
  lowStock: FoodItemView[];
  reorderSoon: FoodItemView[];
  recentDeals: Array<{ foodItemId: Id | null; name: string; brand: string; purchase: PurchaseRecord }>;
  shoppingList: ShoppingListEntry[];
  recentActivity: ActivityEntry[];
  notifications: HouseholdNotification[];
}
