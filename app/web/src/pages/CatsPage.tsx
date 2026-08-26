import { useState } from 'react';
import { Link } from 'react-router-dom';

import { formatUnits } from '../../../shared/format.js';
import type { Cat } from '../../../shared/types.js';
import { CatForm } from '../components/CatForm.js';
import { Badge, Card, EmptyState } from '../components/ui.js';
import { api } from '../lib/api.js';
import { useData, useToast } from '../lib/app-state.js';

/** Cat profiles (PRD §8), each showing the food the household keeps for them. */
export function CatsPage() {
  const { cats, items, run } = useData();
  const { push } = useToast();
  const [editing, setEditing] = useState<Cat | null>(null);
  const [showForm, setShowForm] = useState(false);

  const remove = async (cat: Cat) => {
    if (!window.confirm(`Remove ${cat.name}'s profile? Food stays in the inventory.`)) return;
    try {
      await run(() => api.deleteCat(cat.id));
      push('info', `${cat.name} removed`);
    } catch {
      /* the toast from `run` already explained it */
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__title">
          <h1>Cats</h1>
          <span className="page-header__subtitle">
            {cats.length === 0 ? 'No profiles yet' : `${cats.length} in the household`}
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
          + Add a cat
        </button>
      </div>

      {cats.length === 0 ? (
        <Card>
          <EmptyState
            icon="🐈"
            title="Add your cats"
            action={
              <button type="button" className="button button--primary" onClick={() => setShowForm(true)}>
                Add the first cat
              </button>
            }
          >
            Profiles let you say which food is bought for which cat, and record preferences and
            dietary requirements the whole household can see.
          </EmptyState>
        </Card>
      ) : (
        <div className="cat-grid">
          {cats.map((cat) => {
            const theirFood = items.filter((item) => item.catIds.includes(cat.id));
            const units = theirFood.reduce((sum, item) => sum + item.quantity, 0);
            const isImage = Boolean(cat.photo?.startsWith('data:'));

            return (
              <article key={cat.id} className="cat-card">
                <header className="cat-card__head">
                  <div className="cat-card__avatar" aria-hidden="true">
                    {isImage ? <img src={cat.photo ?? ''} alt="" /> : (cat.photo ?? '🐱')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cat-card__name">{cat.name}</div>
                    <div className="cat-card__meta">
                      {[
                        cat.ageYears !== null ? `${cat.ageYears} years` : null,
                        cat.weightKg !== null ? `${cat.weightKg} kg` : null,
                        cat.mealsPerDay !== null ? `${cat.mealsPerDay} meals/day` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'No details yet'}
                    </div>
                  </div>
                </header>

                {cat.preferences.length > 0 ? (
                  <div className="cat-card__section">
                    <span className="cat-card__label">Prefers</span>
                    <div className="row" style={{ gap: 6 }}>
                      {cat.preferences.map((preference) => (
                        <Badge key={preference} tone="info">
                          {preference}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {cat.dietaryRequirements.length > 0 ? (
                  <div className="cat-card__section">
                    <span className="cat-card__label">Dietary needs</span>
                    <div className="row" style={{ gap: 6 }}>
                      {cat.dietaryRequirements.map((requirement) => (
                        <Badge key={requirement} tone="warn">
                          {requirement}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}

                {cat.favouriteFood ? (
                  <div className="cat-card__section">
                    <span className="cat-card__label">Favourite</span>
                    <span className="small">⭐ {cat.favouriteFood}</span>
                  </div>
                ) : null}

                {cat.notes ? <p className="small muted">{cat.notes}</p> : null}

                <div className="cat-card__section">
                  <span className="cat-card__label">Food in stock</span>
                  {theirFood.length === 0 ? (
                    <span className="small subtle">Nothing is linked to {cat.name} yet.</span>
                  ) : (
                    <>
                      <span className="small">
                        {units} units across {theirFood.length}{' '}
                        {theirFood.length === 1 ? 'item' : 'items'}
                      </span>
                      <span className="small subtle">
                        {theirFood
                          .slice(0, 3)
                          .map((item) => `${item.name} (${formatUnits(item.quantity, item.packageType)})`)
                          .join(', ')}
                        {theirFood.length > 3 ? ', …' : ''}
                      </span>
                    </>
                  )}
                </div>

                <div className="row" style={{ marginTop: 'auto' }}>
                  <Link className="button button--small" to={`/inventory?catId=${cat.id}`}>
                    Their food
                  </Link>
                  <button
                    type="button"
                    className="button button--small button--ghost"
                    onClick={() => {
                      setEditing(cat);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button--small button--ghost button--danger"
                    onClick={() => void remove(cat)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showForm ? (
        <CatForm
          cat={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}
