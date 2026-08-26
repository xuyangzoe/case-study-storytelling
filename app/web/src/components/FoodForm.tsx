import { useState, type FormEvent } from 'react';

import { CATEGORY_LABELS, PACKAGE_LABELS } from '../../../shared/format.js';
import {
  FOOD_CATEGORIES,
  PACKAGE_TYPES,
  type FoodCategory,
  type FoodItemView,
  type PackageType,
} from '../../../shared/types.js';
import { api, fieldIssues } from '../lib/api.js';
import { useData, useToast } from '../lib/app-state.js';
import { Field, Modal } from './ui.js';

interface FormState {
  name: string;
  brand: string;
  category: FoodCategory;
  flavour: string;
  packageType: PackageType;
  quantity: string;
  expiryDate: string;
  catIds: string[];
  storageLocation: string;
  lowStockThreshold: string;
  notes: string;
}

function toFormState(item: FoodItemView | null): FormState {
  return {
    name: item?.name ?? '',
    brand: item?.brand ?? '',
    category: item?.category ?? 'wet_food',
    flavour: item?.flavour ?? '',
    packageType: item?.packageType ?? 'can',
    quantity: String(item?.quantity ?? 0),
    expiryDate: item?.expiryDate ?? '',
    catIds: item?.catIds ?? [],
    storageLocation: item?.storageLocation ?? '',
    lowStockThreshold: item ? String(item.lowStockThreshold) : '',
    notes: item?.notes ?? '',
  };
}

/** Add or edit one food item (PRD §9). */
export function FoodForm({ item, onClose }: { item: FoodItemView | null; onClose: () => void }) {
  const { cats, run } = useData();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => toFormState(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const remove = async (target: FoodItemView) => {
    if (!window.confirm(`Stop tracking ${target.name}? Purchase history is kept.`)) return;
    setSaving(true);
    try {
      await run(() => api.deleteFood(target.id));
      push('info', `${target.name} removed from the inventory`);
      onClose();
    } catch {
      /* `run` has already surfaced the failure */
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      flavour: form.flavour,
      packageType: form.packageType,
      expiryDate: form.expiryDate || null,
      catIds: form.catIds,
      storageLocation: form.storageLocation,
      notes: form.notes,
      ...(form.lowStockThreshold === '' ? {} : { lowStockThreshold: Number(form.lowStockThreshold) }),
    };

    try {
      if (item) {
        await run(async () => {
          await api.updateFood(item.id, payload);
          // Quantity changes go through the adjust endpoint so the correction
          // is attributed in the activity feed like any other change.
          const nextQuantity = Number(form.quantity);
          if (Number.isFinite(nextQuantity) && nextQuantity !== item.quantity) {
            await api.adjustFood(item.id, { quantity: nextQuantity });
          }
        });
        push('success', `${form.name} updated`);
      } else {
        await run(() => api.createFood({ ...payload, quantity: Number(form.quantity) || 0 }));
        push('success', `${form.name} added to the inventory`);
      }
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
      title={item ? `Edit ${item.name}` : 'Add food'}
      subtitle="Everyone in the household sees this straight away."
      onClose={onClose}
      footer={
        <>
          {item ? (
            <button
              type="button"
              className="button button--danger"
              style={{ marginRight: 'auto' }}
              onClick={() => void remove(item)}
              disabled={saving}
            >
              Remove item
            </button>
          ) : null}
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="food-form" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : item ? 'Save changes' : 'Add to inventory'}
          </button>
        </>
      }
    >
      <form id="food-form" className="stack" onSubmit={submit}>
        <div className="field-grid">
          <Field label="Food name" error={errors.name}>
            {(id) => (
              <input
                id={id}
                className="input"
                value={form.name}
                onChange={(event) => set('name', event.target.value)}
                placeholder="Chicken"
                autoFocus
                required
              />
            )}
          </Field>
          <Field label="Brand" error={errors.brand}>
            {(id) => (
              <input
                id={id}
                className="input"
                value={form.brand}
                onChange={(event) => set('brand', event.target.value)}
                placeholder="Royal Canin"
              />
            )}
          </Field>
        </div>

        <Field label="Category">
          {() => (
            <div className="chip-select">
              {FOOD_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`chip${form.category === category ? ' is-selected' : ''}`}
                  onClick={() => set('category', category)}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Package type" hint="Everything is counted in these units.">
          {() => (
            <div className="chip-select">
              {PACKAGE_TYPES.map((packageType) => (
                <button
                  key={packageType}
                  type="button"
                  className={`chip${form.packageType === packageType ? ' is-selected' : ''}`}
                  onClick={() => set('packageType', packageType)}
                >
                  {PACKAGE_LABELS[packageType].many}
                </button>
              ))}
            </div>
          )}
        </Field>

        <div className="field-grid">
          <Field label="Flavour / variant" error={errors.flavour}>
            {(id) => (
              <input
                id={id}
                className="input"
                value={form.flavour}
                onChange={(event) => set('flavour', event.target.value)}
                placeholder="Chicken"
              />
            )}
          </Field>
          <Field
            label={item ? 'Quantity (recount)' : 'Quantity'}
            hint={item ? 'Correcting this is logged like any other change.' : undefined}
            error={errors.quantity}
          >
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(event) => set('quantity', event.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="field-grid">
          <Field label="Expiry date" hint="Optional, but it powers the expiry warnings." error={errors.expiryDate}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="date"
                value={form.expiryDate}
                onChange={(event) => set('expiryDate', event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Low stock at"
            hint="Leave blank for a sensible default."
            error={errors.lowStockThreshold}
          >
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) => set('lowStockThreshold', event.target.value)}
                placeholder="Auto"
              />
            )}
          </Field>
        </div>

        <Field label="Which cats is this for?" hint="Leave empty if it is for everyone.">
          {() => (
            <div className="chip-select">
              {cats.length === 0 ? <span className="subtle small">Add a cat profile first.</span> : null}
              {cats.map((cat) => {
                const selected = form.catIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip${selected ? ' is-selected' : ''}`}
                    onClick={() =>
                      set(
                        'catIds',
                        selected ? form.catIds.filter((id) => id !== cat.id) : [...form.catIds, cat.id],
                      )
                    }
                  >
                    <span aria-hidden="true">{cat.photo && cat.photo.length <= 4 ? cat.photo : '🐾'}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Storage location" error={errors.storageLocation}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.storageLocation}
              onChange={(event) => set('storageLocation', event.target.value)}
              placeholder="Pantry — top shelf"
            />
          )}
        </Field>

        <Field label="Notes" error={errors.notes}>
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              value={form.notes}
              onChange={(event) => set('notes', event.target.value)}
              placeholder="Anything the household should know."
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
