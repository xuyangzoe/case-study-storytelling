import type { Household, User } from '../../shared/types.js';
import type { EventHub } from './events.js';
import type { Store } from './store.js';

export interface AppContext {
  store: Store;
  events: EventHub;
  /** Injectable clock so tests can reason about expiry and consumption windows. */
  now: () => Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      household?: Household;
    }
  }
}

export {};
