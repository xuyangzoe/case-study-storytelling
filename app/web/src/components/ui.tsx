import { useEffect, useId, useState, type ReactNode } from 'react';

import { EXPIRY_LABELS, formatDate, formatDayOffset, STOCK_LABELS } from '../../../shared/format.js';
import type { ExpiryStatus, FoodItemView, StockStatus } from '../../../shared/types.js';
import { useToast } from '../lib/app-state.js';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      <span className="badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

const EXPIRY_TONE: Record<ExpiryStatus, Tone> = {
  unknown: 'neutral',
  normal: 'ok',
  expiring_soon: 'warn',
  expired: 'danger',
};

const STOCK_TONE: Record<StockStatus, Tone> = {
  ok: 'ok',
  low: 'warn',
  out_of_stock: 'danger',
};

/** 🟢 / 🟡 / 🔴 expiry state from PRD §14, with the date spelled out. */
export function ExpiryBadge({ item }: { item: FoodItemView }) {
  if (item.expiryStatus === 'unknown') return <Badge tone="neutral">No expiry date</Badge>;
  return (
    <Badge tone={EXPIRY_TONE[item.expiryStatus]}>
      {EXPIRY_LABELS[item.expiryStatus]} · {formatDayOffset(item.daysUntilExpiry)}
    </Badge>
  );
}

export function StockBadge({ item }: { item: FoodItemView }) {
  if (item.stockStatus === 'ok') return null;
  return <Badge tone={STOCK_TONE[item.stockStatus]}>{STOCK_LABELS[item.stockStatus]}</Badge>;
}

export function ExpiryText({ item }: { item: FoodItemView }) {
  if (!item.expiryDate) return <span className="subtle">No expiry date</span>;
  return (
    <span>
      Expires {formatDate(item.expiryDate)} <span className="subtle">({formatDayOffset(item.daysUntilExpiry)})</span>
    </span>
  );
}

export function Notice({
  tone = 'info',
  icon,
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warn' | 'danger' | 'ok';
  icon?: string;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`notice notice--${tone}`}>
      {icon ? (
        <span className="notice__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <div className="notice__title">{title}</div> : null}
        {children ? <div className="notice__body">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon = '🐾',
  title,
  children,
  action,
}: {
  icon?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="empty__title">{title}</div>
      {children ? <p className="small">{children}</p> : null}
      {action}
    </div>
  );
}

export function Card({
  title,
  hint,
  action,
  flush,
  children,
}: {
  title?: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={`card${flush ? ' card--flush' : ''}`}>
      {title || action ? (
        <header className="card__header" style={flush ? { padding: '16px 18px 0', marginBottom: 12 } : undefined}>
          <div>
            <h2 className="card__title">{title}</h2>
            {hint ? <div className="card__hint">{hint}</div> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  meta,
  icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  icon?: string;
  accent?: boolean;
}) {
  return (
    <div className={`stat${accent ? ' stat--accent' : ''}`}>
      <div className="stat__label">
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        {label}
      </div>
      <div className="stat__value">{value}</div>
      {meta ? <div className="stat__meta">{meta}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? <div className="field__error">{error}</div> : null}
      {hint && !error ? <div className="field__hint">{hint}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p className="muted small">{subtitle}</p> : null}
          </div>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** Free-text list used for cat preferences and dietary requirements. */
export function TagInput({
  values,
  onChange,
  placeholder,
  id,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const value = draft.trim();
    if (!value || values.includes(value)) {
      setDraft('');
      return;
    }
    onChange([...values, value]);
    setDraft('');
  };

  return (
    <div className="tag-input">
      {values.map((value) => (
        <span key={value} className="tag-input__tag">
          {value}
          <button
            type="button"
            className="tag-input__remove"
            aria-label={`Remove ${value}`}
            onClick={() => onChange(values.filter((candidate) => candidate !== value))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        className="tag-input__field"
        value={draft}
        placeholder={values.length === 0 ? placeholder : 'Add another…'}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Backspace' && !draft && values.length > 0) {
            onChange(values.slice(0, -1));
          }
        }}
      />
    </div>
  );
}

export function ToastStack() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tone}`}>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button type="button" className="modal__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
