import { useMemo, useState, type FormEvent } from 'react';

import { bestPurchase, compareDeal } from '../../../shared/domain.js';
import { DEAL_TYPE_LABELS, formatDate, formatMoney, PACKAGE_LABELS } from '../../../shared/format.js';
import { DEAL_TYPES, type DealType, type PurchaseRecord } from '../../../shared/types.js';
import { Badge, Card, EmptyState, Field, Modal, Notice } from '../components/ui.js';
import { api, fieldIssues } from '../lib/api.js';
import { useData, useToast } from '../lib/app-state.js';

/** Purchase history (PRD §15) and the deal comparison of §16. */
export function DealsPage() {
  const { purchases, items } = useData();
  const [recording, setRecording] = useState(false);

  const bestByItem = useMemo(() => {
    const groups = new Map<string, PurchaseRecord[]>();
    for (const purchase of purchases) {
      const key = purchase.foodItemId ?? `name:${purchase.productName.toLowerCase()}`;
      groups.set(key, [...(groups.get(key) ?? []), purchase]);
    }
    const best = new Map<string, string>();
    for (const [key, group] of groups) {
      const winner = bestPurchase(group);
      if (winner) best.set(key, winner.id);
    }
    return new Set(best.values());
  }, [purchases]);

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__title">
          <h1>Deals &amp; prices</h1>
          <span className="page-header__subtitle">
            What you paid last time, so you can tell a real deal from a sticker.
          </span>
        </div>
        <button type="button" className="button button--primary" onClick={() => setRecording(true)}>
          + Record a purchase
        </button>
      </div>

      <DealChecker />

      <Card title={<>🧾 Purchase history</>} hint="Your best price for each product is highlighted." flush>
        {purchases.length === 0 ? (
          <EmptyState
            icon="🏷"
            title="No purchases recorded yet"
            action={
              <button type="button" className="button button--primary" onClick={() => setRecording(true)}>
                Record the first one
              </button>
            }
          >
            Record what you pay and the app remembers the retailer, the bundle size and the unit price.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Retailer</th>
                  <th>Date</th>
                  <th className="numeric">Units</th>
                  <th className="numeric">Paid</th>
                  <th className="numeric">Per unit</th>
                  <th>Deal</th>
                  <th>Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => {
                  const item = items.find((candidate) => candidate.id === purchase.foodItemId);
                  const unit = item ? PACKAGE_LABELS[item.packageType].one : 'unit';
                  return (
                    <tr key={purchase.id} className={bestByItem.has(purchase.id) ? 'table__best' : undefined}>
                      <td>
                        <div className="strong">{purchase.productName}</div>
                        {purchase.notes ? <div className="subtle small">{purchase.notes}</div> : null}
                      </td>
                      <td>{purchase.retailer || '—'}</td>
                      <td className="numeric">{formatDate(purchase.purchasedOn)}</td>
                      <td className="numeric">{purchase.quantity}</td>
                      <td className="numeric">{formatMoney(purchase.totalPaid)}</td>
                      <td className="numeric strong">
                        {formatMoney(purchase.pricePerUnit)}
                        <span className="subtle">/{unit}</span>
                      </td>
                      <td>
                        {bestByItem.has(purchase.id) ? (
                          <Badge tone="ok">Best · {DEAL_TYPE_LABELS[purchase.dealType]}</Badge>
                        ) : (
                          <span className="subtle">{DEAL_TYPE_LABELS[purchase.dealType]}</span>
                        )}
                      </td>
                      <td className="subtle">{purchase.recordedByName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {recording ? <PurchaseForm onClose={() => setRecording(false)} /> : null}
    </div>
  );
}

/** "Is this actually cheap?" — checked against the household's own history. */
function DealChecker() {
  const { items, purchases } = useData();
  const [foodItemId, setFoodItemId] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const history = useMemo(
    () => purchases.filter((purchase) => purchase.foodItemId === foodItemId),
    [purchases, foodItemId],
  );

  const comparison = useMemo(() => {
    const price = Number(totalPrice);
    const units = Number(quantity);
    if (!foodItemId || !Number.isFinite(price) || !Number.isFinite(units) || price <= 0 || units <= 0) {
      return null;
    }
    return compareDeal({ totalPrice: price, quantity: units }, history);
  }, [foodItemId, totalPrice, quantity, history]);

  const item = items.find((candidate) => candidate.id === foodItemId);
  const unit = item ? PACKAGE_LABELS[item.packageType].one : 'unit';

  return (
    <Card title={<>🔍 Check a deal</>} hint="Standing in the shop? Compare the offer with what you have paid.">
      <div className="field-grid">
        <Field label="Which product?">
          {(id) => (
            <select
              id={id}
              className="select"
              value={foodItemId}
              onChange={(event) => setFoodItemId(event.target.value)}
            >
              <option value="">Choose an item…</option>
              {items.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.brand} {candidate.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Offer price">
          {(id) => (
            <input
              id={id}
              className="input"
              type="number"
              min={0}
              step="0.01"
              value={totalPrice}
              onChange={(event) => setTotalPrice(event.target.value)}
              placeholder="70.00"
            />
          )}
        </Field>
        <Field label={`How many ${item ? PACKAGE_LABELS[item.packageType].many : 'units'}?`}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="24"
            />
          )}
        </Field>
      </div>

      {comparison ? (
        <div style={{ marginTop: 14 }}>
          {comparison.verdict === 'no_history' ? (
            <Notice tone="info" icon="ℹ️" title="No history for this item yet">
              {comparison.message} That works out at {formatMoney(comparison.pricePerUnit)} per {unit}.
            </Notice>
          ) : (
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
              This offer is {formatMoney(comparison.pricePerUnit)} per {unit}. Your previous best was{' '}
              {formatMoney(comparison.previousBestPricePerUnit)} per {unit}
              {comparison.previousBest?.retailer ? ` at ${comparison.previousBest.retailer}` : ''}
              {comparison.previousBest ? ` on ${formatDate(comparison.previousBest.purchasedOn)}` : ''}.{' '}
              <strong>{comparison.message}</strong>
            </Notice>
          )}
        </div>
      ) : null}
    </Card>
  );
}

function PurchaseForm({ onClose }: { onClose: () => void }) {
  const { items, run } = useData();
  const { push } = useToast();
  const [foodItemId, setFoodItemId] = useState('');
  const [productName, setProductName] = useState('');
  const [retailer, setRetailer] = useState('');
  const [purchasedOn, setPurchasedOn] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('');
  const [totalPaid, setTotalPaid] = useState('');
  const [regularPrice, setRegularPrice] = useState('');
  const [dealType, setDealType] = useState<DealType>('regular');
  const [notes, setNotes] = useState('');
  const [addToInventory, setAddToInventory] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await run(() =>
        api.recordPurchase({
          foodItemId: foodItemId || null,
          productName,
          retailer,
          purchasedOn,
          quantity: Number(quantity),
          totalPaid: Number(totalPaid),
          regularPrice: regularPrice === '' ? null : Number(regularPrice),
          dealType,
          notes,
          addToInventory: addToInventory && Boolean(foodItemId),
        }),
      );
      push('success', 'Purchase recorded');
      onClose();
    } catch (cause) {
      const issues = fieldIssues(cause);
      if (issues.length > 0) {
        setErrors(Object.fromEntries(issues.map((issue) => [issue.field, issue.message])));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Record a purchase"
      subtitle="This becomes the household's price reference for next time."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="purchase-form" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save purchase'}
          </button>
        </>
      }
    >
      <form id="purchase-form" className="stack" onSubmit={submit}>
        <Field label="Inventory item" hint="Link it so the price attaches to the food you track.">
          {(id) => (
            <select
              id={id}
              className="select"
              value={foodItemId}
              onChange={(event) => {
                setFoodItemId(event.target.value);
                const chosen = items.find((candidate) => candidate.id === event.target.value);
                if (chosen) setProductName(`${chosen.brand} ${chosen.name}`.trim());
              }}
            >
              <option value="">Not tracked — enter a name below</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.brand} {item.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Product name" error={errors.productName}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={productName}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="Royal Canin Chicken"
              required={!foodItemId}
            />
          )}
        </Field>

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
          <Field label="Date" error={errors.purchasedOn}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="date"
                value={purchasedOn}
                onChange={(event) => setPurchasedOn(event.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="field-grid">
          <Field label="Units bought" error={errors.quantity}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="24"
                required
              />
            )}
          </Field>
          <Field label="Total paid" error={errors.totalPaid}>
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
                required
              />
            )}
          </Field>
          <Field label="Regular price" hint="Optional — what it usually costs.">
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                step="0.01"
                value={regularPrice}
                onChange={(event) => setRegularPrice(event.target.value)}
                placeholder="84.00"
              />
            )}
          </Field>
        </div>

        <Field label="Deal type">
          {() => (
            <div className="chip-select">
              {DEAL_TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`chip${dealType === value ? ' is-selected' : ''}`}
                  onClick={() => setDealType(value)}
                >
                  {DEAL_TYPE_LABELS[value]}
                </button>
              ))}
            </div>
          )}
        </Field>

        {foodItemId ? (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={addToInventory}
              onChange={(event) => setAddToInventory(event.target.checked)}
            />
            <span>
              <span className="strong">Add these units to the inventory</span>
              <span className="field__hint"> The stock count goes up by the quantity above.</span>
            </span>
          </label>
        ) : null}

        <Field label="Notes">
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Bundle deal, two boxes for the price of one…"
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
