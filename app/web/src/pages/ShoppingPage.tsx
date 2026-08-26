import { useMemo, useState, type FormEvent } from 'react';

import { compareDeal } from '../../../shared/domain.js';
import {
  DEAL_TYPE_LABELS,
  formatDays,
  formatMoney,
  formatRelativeTime,
  PACKAGE_LABELS,
} from '../../../shared/format.js';
import { DEAL_TYPES, type DealType, type ShoppingListEntry } from '../../../shared/types.js';
import { Badge, Card, EmptyState, Field, Modal, Notice } from '../components/ui.js';
import { api } from '../lib/api.js';
import { describeShoppingFailure, useAddToShoppingList } from '../lib/actions.js';
import { useData, useToast } from '../lib/app-state.js';

/** The shared shopping list (PRD §12) with the duplicate guard of §13. */
export function ShoppingPage() {
  const { shopping, items, purchases, run } = useData();
  const { push } = useToast();
  const addToList = useAddToShoppingList();

  const [draft, setDraft] = useState('');
  const [buying, setBuying] = useState<ShoppingListEntry | null>(null);

  const needed = shopping.filter((entry) => entry.status === 'needed');
  const purchased = shopping.filter((entry) => entry.status === 'purchased').slice(0, 8);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const suggestions = useMemo(
    () =>
      items
        .filter((item) => !item.onShoppingList && (item.stockStatus !== 'ok' || item.consumption.reorderSoon))
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6),
    [items],
  );

  const addFreeText = async (event: FormEvent) => {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    try {
      await run(() => api.addShopping({ name }), { silent: true });
      setDraft('');
      push('success', `${name} added to the list`);
    } catch (cause) {
      push('warning', describeShoppingFailure(cause));
    }
  };

  const remove = async (entry: ShoppingListEntry) => {
    try {
      await run(() => api.removeShopping(entry.id));
    } catch {
      /* already reported */
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__title">
          <h1>Shopping list</h1>
          <span className="page-header__subtitle">
            Shared with everyone — so nobody buys the same thing twice.
          </span>
        </div>
      </div>

      <Card>
        <form className="row" onSubmit={addFreeText}>
          <input
            className="input"
            style={{ flex: '1 1 240px' }}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add something to buy…"
            aria-label="Add something to the shopping list"
          />
          <button type="submit" className="button button--primary" disabled={!draft.trim()}>
            Add
          </button>
        </form>
      </Card>

      <Card title={<>🛒 To buy</>} hint={`${needed.length} ${needed.length === 1 ? 'item' : 'items'}`} flush>
        {needed.length === 0 ? (
          <EmptyState icon="✅" title="Nothing on the list">
            Add something above, or pick one of the suggestions below.
          </EmptyState>
        ) : (
          <div className="item-list">
            {needed.map((entry) => {
              const item = entry.foodItemId ? itemsById.get(entry.foodItemId) : undefined;
              const tone =
                item?.stockStatus === 'out_of_stock' || item?.stockStatus === 'low'
                  ? 'danger'
                  : item?.consumption.reorderSoon
                    ? 'warn'
                    : item
                      ? 'ok'
                      : 'neutral';
              const label =
                item?.stockStatus === 'out_of_stock'
                  ? 'Out of stock'
                  : item?.stockStatus === 'low'
                    ? 'Low stock'
                    : item?.consumption.reorderSoon
                      ? 'Reorder soon'
                      : item
                        ? 'Enough stock'
                        : 'Not tracked yet';

              return (
                <div key={entry.id} className="item">
                  <div className="item__main">
                    <div className="item__name">
                      <span>{entry.name}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <div className="item__meta">
                      <span>
                        Added by {entry.addedByName} · {formatRelativeTime(entry.addedAt).toLowerCase()}
                      </span>
                      {entry.note ? <span>“{entry.note}”</span> : null}
                      {item?.bestPricePerUnit != null ? (
                        <span>
                          Best {formatMoney(item.bestPricePerUnit)}/
                          {PACKAGE_LABELS[item.packageType].one}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="item__actions">
                    <button type="button" className="button button--small button--primary" onClick={() => setBuying(entry)}>
                      Mark bought
                    </button>
                    <button
                      type="button"
                      className="button button--small button--ghost"
                      onClick={() => void remove(entry)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {suggestions.length > 0 ? (
        <Card title={<>💡 Might be worth adding</>} hint="Low stock or predicted to run out soon.">
          <div className="stack stack--tight">
            {suggestions.map((item) => (
              <div key={item.id} className="row row--between">
                <div style={{ minWidth: 0 }}>
                  <div className="strong">
                    {item.brand} {item.name}
                  </div>
                  <div className="subtle small">
                    {item.quantity} left
                    {item.consumption.daysRemaining !== null
                      ? ` · ~${formatDays(item.consumption.daysRemaining)} remaining`
                      : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="button button--small"
                  onClick={() => void addToList(item, 'low_stock')}
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {purchased.length > 0 ? (
        <Card title={<>✅ Recently bought</>}>
          <div className="stack stack--tight">
            {purchased.map((entry) => (
              <div key={entry.id} className="row row--between small">
                <span>{entry.name}</span>
                <span className="subtle">
                  {entry.purchasedByName} · {formatRelativeTime(entry.purchasedAt ?? entry.addedAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {buying ? (
        <BuyModal
          entry={buying}
          onClose={() => setBuying(null)}
          purchases={purchases}
          packageLabel={
            buying.foodItemId
              ? PACKAGE_LABELS[itemsById.get(buying.foodItemId)?.packageType ?? 'other'].many
              : 'units'
          }
        />
      ) : null}
    </div>
  );
}

/** Marking something bought restocks the shelf and files the price in one step. */
function BuyModal({
  entry,
  onClose,
  purchases,
  packageLabel,
}: {
  entry: ShoppingListEntry;
  onClose: () => void;
  purchases: ReturnType<typeof useData>['purchases'];
  packageLabel: string;
}) {
  const { run } = useData();
  const { push } = useToast();
  const [quantity, setQuantity] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [retailer, setRetailer] = useState('');
  const [dealType, setDealType] = useState<DealType>('regular');
  const [saving, setSaving] = useState(false);

  const history = useMemo(
    () =>
      purchases.filter((purchase) =>
        entry.foodItemId
          ? purchase.foodItemId === entry.foodItemId
          : purchase.productName.toLowerCase() === entry.name.toLowerCase(),
      ),
    [purchases, entry],
  );

  // Same comparison the API performs, run locally so the verdict updates as you type.
  const comparison = useMemo(() => {
    const price = Number(totalPaid);
    const units = Number(quantity);
    if (!Number.isFinite(price) || !Number.isFinite(units) || price <= 0 || units <= 0) return null;
    return compareDeal({ totalPrice: price, quantity: units }, history);
  }, [totalPaid, quantity, history]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await run(() =>
        api.buyShopping(entry.id, {
          quantity: Number(quantity) || 0,
          totalPaid: totalPaid === '' ? null : Number(totalPaid),
          retailer,
          dealType,
        }),
      );
      push('success', `${entry.name} marked as bought`);
      onClose();
    } catch {
      /* already reported */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={`Bought ${entry.name}`}
      subtitle="Adding the count and price keeps the inventory and your price history current."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="buy-form" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Mark as bought'}
          </button>
        </>
      }
    >
      <form id="buy-form" className="stack" onSubmit={submit}>
        <div className="field-grid">
          <Field label={`How many ${packageLabel}?`} hint="Added to the shared inventory.">
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="24"
                autoFocus
              />
            )}
          </Field>
          <Field label="Total paid" hint="Optional — but it builds your price reference.">
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={totalPaid}
                onChange={(event) => setTotalPaid(event.target.value)}
                placeholder="72.00"
              />
            )}
          </Field>
        </div>

        <div className="field-grid">
          <Field label="Retailer">
            {(id) => (
              <input
                id={id}
                className="input"
                value={retailer}
                onChange={(event) => setRetailer(event.target.value)}
                placeholder="Petbarn"
              />
            )}
          </Field>
          <Field label="Deal type">
            {(id) => (
              <select
                id={id}
                className="select"
                value={dealType}
                onChange={(event) => setDealType(event.target.value as DealType)}
              >
                {DEAL_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {DEAL_TYPE_LABELS[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        {comparison && comparison.verdict !== 'no_history' ? (
          <Notice
            tone={comparison.verdict === 'not_best_price' ? 'warn' : 'ok'}
            icon={comparison.verdict === 'not_best_price' ? '🔴' : '🟢'}
            title={
              comparison.verdict === 'good_deal'
                ? 'Good deal'
                : comparison.verdict === 'matches_best'
                  ? 'Matches your best price'
                  : 'Not your best price'
            }
          >
            {formatMoney(comparison.pricePerUnit)} per unit · your previous best was{' '}
            {formatMoney(comparison.previousBestPricePerUnit)}. {comparison.message}
          </Notice>
        ) : null}
      </form>
    </Modal>
  );
}
