import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {
  ActivityEntry,
  Cat,
  DashboardSummary,
  FoodItemView,
  Household,
  PurchaseRecord,
  ShoppingListEntry,
  User,
} from '../../../shared/types.js';
import { api, ApiError, subscribeToHousehold, tokenStore } from './api.js';

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export interface Toast {
  id: number;
  tone: 'info' | 'success' | 'warning' | 'danger';
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (tone: Toast['tone'], message: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside AppProvider');
  return value;
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

interface SessionValue {
  user: User | null;
  household: Household | null;
  status: 'loading' | 'ready';
  signIn: (input: { name: string; email: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setHousehold: (household: Household | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside AppProvider');
  return value;
}

/* ------------------------------------------------------------------ */
/* Household data                                                      */
/* ------------------------------------------------------------------ */

export interface HouseholdData {
  dashboard: DashboardSummary | null;
  items: FoodItemView[];
  cats: Cat[];
  shopping: ShoppingListEntry[];
  purchases: PurchaseRecord[];
  activity: ActivityEntry[];
}

const EMPTY_DATA: HouseholdData = {
  dashboard: null,
  items: [],
  cats: [],
  shopping: [],
  purchases: [],
  activity: [],
};

interface DataValue extends HouseholdData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Optimistic, debounced quantity stepper (PRD §11). */
  adjust: (itemId: string, delta: number) => void;
  /**
   * Runs an action, refreshes, and reports failures as a toast. Pass
   * `{ silent: true }` when the caller shows a better message itself.
   */
  run: <T>(action: () => Promise<T>, options?: { silent?: boolean }) => Promise<T | null>;
}

const DataContext = createContext<DataValue | null>(null);

export function useData(): DataValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useData must be used inside AppProvider');
  return value;
}

/** Bursts of stepper taps become one request, and one activity entry. */
const ADJUST_DEBOUNCE_MS = 600;

export function AppProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = (toastId.current += 1);
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [status, setStatus] = useState<SessionValue['status']>('loading');

  const [data, setData] = useState<HouseholdData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const token = tokenStore.get();
    if (!token) {
      setStatus('ready');
      return () => {
        cancelled = true;
      };
    }
    api
      .me()
      .then((result) => {
        if (cancelled) return;
        setUser(result.user);
        setHousehold(result.household);
      })
      .catch(() => {
        tokenStore.set(null);
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!household) {
      setData(EMPTY_DATA);
      return;
    }
    setLoading(true);
    try {
      const [dashboard, items, cats, shopping, purchases, activity] = await Promise.all([
        api.dashboard(),
        api.listFood({ sort: 'expiry' }),
        api.listCats(),
        api.listShopping(),
        api.listPurchases(),
        api.activity(100),
      ]);
      setData({
        dashboard: dashboard.dashboard,
        items: items.items,
        cats: cats.cats,
        shopping: shopping.entries,
        purchases: purchases.purchases,
        activity: activity.activity,
      });
      setError(null);
    } catch (cause) {
      if (cause instanceof ApiError && cause.needsHousehold) {
        setHousehold(null);
        setData(EMPTY_DATA);
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not load the household');
      }
    } finally {
      setLoading(false);
    }
  }, [household]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live updates: any change made by any member re-pulls the shared state.
  useEffect(() => {
    if (!household) return undefined;
    return subscribeToHousehold(() => {
      void refresh();
    });
  }, [household, refresh]);

  const pendingAdjustments = useRef(new Map<string, { delta: number; timer: number }>());

  const flushAdjustment = useCallback(
    async (itemId: string) => {
      const pending = pendingAdjustments.current.get(itemId);
      pendingAdjustments.current.delete(itemId);
      if (!pending || pending.delta === 0) return;
      try {
        await api.adjustFood(itemId, { delta: pending.delta });
      } catch (cause) {
        push('danger', cause instanceof Error ? cause.message : 'Could not update the count');
      } finally {
        void refresh();
      }
    },
    [push, refresh],
  );

  const adjust = useCallback(
    (itemId: string, delta: number) => {
      // Move the number on screen first; the request follows once tapping stops.
      setData((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item,
        ),
      }));

      const pending = pendingAdjustments.current.get(itemId);
      if (pending) window.clearTimeout(pending.timer);
      const timer = window.setTimeout(() => void flushAdjustment(itemId), ADJUST_DEBOUNCE_MS);
      pendingAdjustments.current.set(itemId, {
        delta: (pending?.delta ?? 0) + delta,
        timer,
      });
    },
    [flushAdjustment],
  );

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options?: { silent?: boolean }): Promise<T | null> => {
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (cause) {
        // Validation failures are shown inline on the offending field instead.
        const reportable =
          !options?.silent && cause instanceof ApiError && cause.code !== 'validation_failed';
        if (reportable) {
          push((cause as ApiError).status === 409 ? 'warning' : 'danger', (cause as ApiError).message);
        }
        throw cause;
      }
    },
    [push, refresh],
  );

  const signIn = useCallback(async (input: { name: string; email: string }) => {
    const result = await api.signIn(input);
    tokenStore.set(result.token);
    setUser(result.user);
    setHousehold(result.household);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      tokenStore.set(null);
      setUser(null);
      setHousehold(null);
      setData(EMPTY_DATA);
    }
  }, []);

  const sessionValue = useMemo<SessionValue>(
    () => ({ user, household, status, signIn, signOut, setHousehold }),
    [user, household, status, signIn, signOut],
  );

  const dataValue = useMemo<DataValue>(
    () => ({ ...data, loading, error, refresh, adjust, run }),
    [data, loading, error, refresh, adjust, run],
  );

  const toastValue = useMemo<ToastContextValue>(
    () => ({ toasts, push, dismiss }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={toastValue}>
      <SessionContext.Provider value={sessionValue}>
        <DataContext.Provider value={dataValue}>{children}</DataContext.Provider>
      </SessionContext.Provider>
    </ToastContext.Provider>
  );
}
