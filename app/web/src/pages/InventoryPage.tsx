import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CATEGORY_LABELS } from '../../../shared/format.js';
import { FOOD_CATEGORIES, type ExpiryStatus, type FoodItemView } from '../../../shared/types.js';
import { FoodForm } from '../components/FoodForm.js';
import { FoodItemRow } from '../components/FoodItem.js';
import { Card, EmptyState } from '../components/ui.js';
import { useAddToShoppingList } from '../lib/actions.js';
import { useData } from '../lib/app-state.js';

type SortKey = 'expiry' | 'expiry_desc' | 'name' | 'quantity';

const EXPIRY_FILTERS: Array<{ value: ExpiryStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'expiring_soon', label: '🟡 Expiring soon' },
  { value: 'expired', label: '🔴 Expired' },
  { value: 'normal', label: '🟢 Normal' },
];

/** The shared inventory (PRD §9) with the expiry sorting of §14. */
export function InventoryPage() {
  const { items, cats } = useData();
  const addToList = useAddToShoppingList();
  const [searchParams, setSearchParams] = useSearchParams();

  const [editing, setEditing] = useState<FoodItemView | null>(null);
  const [showForm, setShowForm] = useState(false);

  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const catId = searchParams.get('catId') ?? 'all';
  const expiry = (searchParams.get('expiry') ?? 'all') as ExpiryStatus | 'all';
  const lowOnly = searchParams.get('stock') === 'low';
  const sort = (searchParams.get('sort') ?? 'expiry') as SortKey;

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (catId !== 'all' && !item.catIds.includes(catId)) return false;
      if (expiry !== 'all' && item.expiryStatus !== expiry) return false;
      if (lowOnly && item.stockStatus === 'ok') return false;
      if (!needle) return true;
      return `${item.name} ${item.brand} ${item.flavour} ${item.storageLocation}`
        .toLowerCase()
        .includes(needle);
    });

    const byExpiry = (a: FoodItemView, b: FoodItemView, direction: 1 | -1) => {
      if (!a.expiryDate && !b.expiryDate) return a.name.localeCompare(b.name);
      if (!a.expiryDate) return 1;
      if (!b.expiryDate) return -1;
      return direction * a.expiryDate.localeCompare(b.expiryDate);
    };

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'expiry_desc':
          return byExpiry(a, b, -1);
        case 'name':
          return `${a.brand} ${a.name}`.localeCompare(`${b.brand} ${b.name}`);
        case 'quantity':
          return a.quantity - b.quantity;
        case 'expiry':
        default:
          return byExpiry(a, b, 1);
      }
    });
  }, [items, search, category, catId, expiry, lowOnly, sort]);

  const totalUnits = visible.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__title">
          <h1>Inventory</h1>
          <span className="page-header__subtitle">
            {visible.length} of {items.length} items · {totalUnits} units
          </span>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          + Add food
        </button>
      </div>

      <Card>
        <div className="stack stack--tight">
          <div className="row">
            <input
              className="input"
              style={{ flex: '1 1 220px', maxWidth: 340 }}
              value={search}
              onChange={(event) => update('search', event.target.value)}
              placeholder="Search food, brand, flavour or shelf…"
              aria-label="Search the inventory"
            />
            <label className="row" style={{ gap: 6 }}>
              <span className="subtle small">Sort</span>
              <select
                className="select"
                style={{ width: 'auto' }}
                value={sort}
                onChange={(event) => update('sort', event.target.value)}
                aria-label="Sort inventory"
              >
                <option value="expiry">Soonest expiry</option>
                <option value="expiry_desc">Latest expiry</option>
                <option value="name">Name</option>
                <option value="quantity">Fewest units</option>
              </select>
            </label>
            <label className="row" style={{ gap: 6 }}>
              <input
                type="checkbox"
                checked={lowOnly}
                onChange={(event) => update('stock', event.target.checked ? 'low' : '')}
              />
              <span className="small">Low stock only</span>
            </label>
          </div>

          <div className="chip-select">
            {EXPIRY_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                className={`chip${expiry === filter.value ? ' is-selected' : ''}`}
                onClick={() => update('expiry', filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="chip-select">
            <button
              type="button"
              className={`chip${category === 'all' ? ' is-selected' : ''}`}
              onClick={() => update('category', 'all')}
            >
              All categories
            </button>
            {FOOD_CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip${category === value ? ' is-selected' : ''}`}
                onClick={() => update('category', value)}
              >
                {CATEGORY_LABELS[value]}
              </button>
            ))}
          </div>

          {cats.length > 0 ? (
            <div className="chip-select">
              <button
                type="button"
                className={`chip${catId === 'all' ? ' is-selected' : ''}`}
                onClick={() => update('catId', 'all')}
              >
                All cats
              </button>
              {cats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`chip${catId === cat.id ? ' is-selected' : ''}`}
                  onClick={() => update('catId', cat.id)}
                >
                  <span aria-hidden="true">{cat.photo && cat.photo.length <= 4 ? cat.photo : '🐾'}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <Card flush>
        {visible.length === 0 ? (
          <EmptyState
            icon="🥫"
            title={items.length === 0 ? 'The pantry is empty' : 'Nothing matches those filters'}
            action={
              items.length === 0 ? (
                <button type="button" className="button button--primary" onClick={() => setShowForm(true)}>
                  Add the first item
                </button>
              ) : undefined
            }
          >
            {items.length === 0
              ? 'Add what is on the shelf and the whole household can see it.'
              : 'Try clearing a filter or searching for something else.'}
          </EmptyState>
        ) : (
          <div className="item-list">
            {visible.map((item) => (
              <FoodItemRow
                key={item.id}
                item={item}
                onAddToList={(target) => void addToList(target)}
                onEdit={(target) => {
                  setEditing(target);
                  setShowForm(true);
                }}
              />
            ))}
          </div>
        )}
      </Card>

      {showForm ? (
        <FoodForm
          item={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
