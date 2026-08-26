import {
  CATEGORY_LABELS,
  formatDays,
  formatMoney,
  formatUnits,
  PACKAGE_LABELS,
} from '../../../shared/format.js';
import type { FoodItemView } from '../../../shared/types.js';
import { useData } from '../lib/app-state.js';
import { Badge, ExpiryBadge, ExpiryText, StockBadge } from './ui.js';

/**
 * The quick inventory update from PRD §11 — the interaction the household uses
 * most, so it is one tap and the number moves immediately.
 */
export function Stepper({ item }: { item: FoodItemView }) {
  const { adjust } = useData();
  const units = PACKAGE_LABELS[item.packageType];

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__button"
        onClick={() => adjust(item.id, -1)}
        disabled={item.quantity <= 0}
        aria-label={`Use one ${units.one} of ${item.name}`}
      >
        −
      </button>
      <span className="stepper__value">
        {item.quantity}
        <span className="stepper__unit">{item.quantity === 1 ? units.one : units.many}</span>
      </span>
      <button
        type="button"
        className="stepper__button"
        onClick={() => adjust(item.id, 1)}
        aria-label={`Add one ${units.one} of ${item.name}`}
      >
        +
      </button>
    </div>
  );
}

export function FoodItemRow({
  item,
  onEdit,
  onAddToList,
  showConsumption = true,
}: {
  item: FoodItemView;
  onEdit?: (item: FoodItemView) => void;
  onAddToList?: (item: FoodItemView) => void;
  showConsumption?: boolean;
}) {
  const flagged =
    item.expiryStatus === 'expired'
      ? 'item--expired'
      : item.expiryStatus === 'expiring_soon' || item.stockStatus !== 'ok'
        ? 'item--flagged'
        : '';

  return (
    <div className={`item ${flagged}`.trim()}>
      <div className="item__main">
        <div className="item__name">
          <span>{item.name}</span>
          {item.brand ? <span className="item__brand">{item.brand}</span> : null}
          <ExpiryBadge item={item} />
          <StockBadge item={item} />
        </div>
        <div className="item__meta">
          <span>{CATEGORY_LABELS[item.category]}</span>
          {item.flavour ? <span>{item.flavour}</span> : null}
          <ExpiryText item={item} />
          {item.storageLocation ? <span>📍 {item.storageLocation}</span> : null}
          {item.cats.map((cat) => (
            <span key={cat.id} className="cat-chip">
              <span aria-hidden="true">{cat.photo && cat.photo.length <= 4 ? cat.photo : '🐾'}</span>
              {cat.name}
            </span>
          ))}
          {showConsumption && item.consumption.daysRemaining !== null ? (
            <span title={`About ${item.consumption.averageDailyUsage} per day`}>
              ~{formatDays(item.consumption.daysRemaining)} left
            </span>
          ) : null}
          {item.bestPricePerUnit !== null ? (
            <span>
              Best {formatMoney(item.bestPricePerUnit)}/{PACKAGE_LABELS[item.packageType].one}
            </span>
          ) : null}
          {item.onShoppingList ? (
            <Badge tone="info">On the list · {item.onShoppingList.addedByName}</Badge>
          ) : null}
        </div>
      </div>

      <div className="item__actions">
        <Stepper item={item} />
        {onAddToList && !item.onShoppingList ? (
          <button
            type="button"
            className="button button--small"
            onClick={() => onAddToList(item)}
            title="Add to the shared shopping list"
          >
            🛒 Add
          </button>
        ) : null}
        {onEdit ? (
          <button type="button" className="button button--small button--ghost" onClick={() => onEdit(item)}>
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Compact one-line summary used inside dashboard cards. */
export function FoodItemMini({ item, meta }: { item: FoodItemView; meta?: string }) {
  return (
    <div className="row row--between" style={{ gap: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div className="strong" style={{ overflowWrap: 'anywhere' }}>
          {item.brand ? `${item.brand} ` : ''}
          {item.name}
        </div>
        <div className="subtle small">{meta ?? formatUnits(item.quantity, item.packageType)}</div>
      </div>
      <Stepper item={item} />
    </div>
  );
}
