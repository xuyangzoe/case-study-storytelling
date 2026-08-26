import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

import type {
  ActivityEntry,
  Cat,
  FoodItem,
  Household,
  PurchaseRecord,
  ShoppingListEntry,
  User,
} from '../../shared/types.js';

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface Database {
  version: number;
  users: User[];
  households: Household[];
  cats: Cat[];
  foodItems: FoodItem[];
  activity: ActivityEntry[];
  shoppingList: ShoppingListEntry[];
  purchases: PurchaseRecord[];
  sessions: Session[];
}

export function emptyDatabase(): Database {
  return {
    version: 1,
    users: [],
    households: [],
    cats: [],
    foodItems: [],
    activity: [],
    shoppingList: [],
    purchases: [],
    sessions: [],
  };
}

/**
 * A tiny document store: the whole household database is held in memory and
 * flushed to one JSON file.
 *
 * A household's data is small (hundreds of rows), so this keeps the MVP free of
 * native dependencies and migrations. Every read and write goes through this
 * class, so swapping in SQLite or Postgres later is a contained change.
 */
export class Store {
  private db: Database;
  /** Serialises writes so two concurrent requests cannot interleave a flush. */
  private writeChain: Promise<void> = Promise.resolve();

  private constructor(
    private readonly file: string | null,
    db: Database,
  ) {
    this.db = db;
  }

  /** `file: null` keeps everything in memory, which is what the tests use. */
  static open(file: string | null): Store {
    if (!file) return new Store(null, emptyDatabase());

    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8').trim();
      const parsed = raw ? (JSON.parse(raw) as Partial<Database>) : {};
      return new Store(file, { ...emptyDatabase(), ...parsed });
    }

    fs.mkdirSync(path.dirname(file), { recursive: true });
    const store = new Store(file, emptyDatabase());
    fs.writeFileSync(file, JSON.stringify(store.db, null, 2));
    return store;
  }

  /** Read-only access to the current snapshot. */
  get data(): Readonly<Database> {
    return this.db;
  }

  /** Applies a change and flushes it before resolving. */
  async mutate<T>(fn: (db: Database) => T): Promise<T> {
    const result = fn(this.db);
    await this.flush();
    return result;
  }

  private flush(): Promise<void> {
    if (!this.file) return Promise.resolve();
    const file = this.file;

    this.writeChain = this.writeChain.then(async () => {
      // Write-then-rename keeps the file readable if the process dies mid-write.
      const payload = JSON.stringify(this.db, null, 2);
      const tempFile = `${file}.${process.pid}.tmp`;
      await fsp.mkdir(path.dirname(file), { recursive: true });
      await fsp.writeFile(tempFile, payload, 'utf8');
      await fsp.rename(tempFile, file);
    });

    return this.writeChain;
  }

  /** Replaces the entire database. Used by the seed script. */
  async reset(db: Database = emptyDatabase()): Promise<void> {
    this.db = db;
    await this.flush();
  }
}
