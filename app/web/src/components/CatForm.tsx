import { useState, type ChangeEvent, type FormEvent } from 'react';

import type { Cat } from '../../../shared/types.js';
import { api, fieldIssues } from '../lib/api.js';
import { useData, useToast } from '../lib/app-state.js';
import { Field, Modal, TagInput } from './ui.js';

const EMOJI_CHOICES = ['🐱', '🐈', '🐈‍⬛', '😺', '😻', '🙀', '🐾', '🦁'];
const MAX_PHOTO_EDGE = 200;

/** Downscales a chosen photo in the browser so profiles stay small to store. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('That file is not an image'));
      image.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Could not process that image'));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

interface FormState {
  name: string;
  photo: string;
  ageYears: string;
  weightKg: string;
  mealsPerDay: string;
  preferences: string[];
  dietaryRequirements: string[];
  favouriteFood: string;
  notes: string;
}

function toFormState(cat: Cat | null): FormState {
  return {
    name: cat?.name ?? '',
    photo: cat?.photo ?? '🐱',
    ageYears: cat?.ageYears === null || cat?.ageYears === undefined ? '' : String(cat.ageYears),
    weightKg: cat?.weightKg === null || cat?.weightKg === undefined ? '' : String(cat.weightKg),
    mealsPerDay: cat?.mealsPerDay === null || cat?.mealsPerDay === undefined ? '' : String(cat.mealsPerDay),
    preferences: cat?.preferences ?? [],
    dietaryRequirements: cat?.dietaryRequirements ?? [],
    favouriteFood: cat?.favouriteFood ?? '',
    notes: cat?.notes ?? '',
  };
}

const optionalNumber = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Cat profiles from PRD §8. */
export function CatForm({ cat, onClose }: { cat: Cat | null; onClose: () => void }) {
  const { run } = useData();
  const { push } = useToast();
  const [form, setForm] = useState<FormState>(() => toFormState(cat));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      set('photo', await readPhoto(file));
    } catch (cause) {
      push('danger', cause instanceof Error ? cause.message : 'Could not use that photo');
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      name: form.name,
      photo: form.photo || null,
      ageYears: optionalNumber(form.ageYears),
      weightKg: optionalNumber(form.weightKg),
      mealsPerDay: optionalNumber(form.mealsPerDay),
      preferences: form.preferences,
      dietaryRequirements: form.dietaryRequirements,
      favouriteFood: form.favouriteFood || null,
      notes: form.notes || null,
    };

    try {
      await run(() => (cat ? api.updateCat(cat.id, payload) : api.createCat(payload)));
      push('success', cat ? `${form.name}'s profile updated` : `${form.name} added to the household`);
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

  const isImage = form.photo.startsWith('data:');

  return (
    <Modal
      title={cat ? `Edit ${cat.name}` : 'Add a cat'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="cat-form" className="button button--primary" disabled={saving}>
            {saving ? 'Saving…' : cat ? 'Save changes' : 'Add cat'}
          </button>
        </>
      }
    >
      <form id="cat-form" className="stack" onSubmit={submit}>
        <div className="row" style={{ gap: 16, alignItems: 'flex-start' }}>
          <div className="cat-card__avatar" aria-hidden="true">
            {isImage ? <img src={form.photo} alt="" /> : form.photo}
          </div>
          <div className="stack stack--tight" style={{ flex: 1, minWidth: 200 }}>
            <div className="chip-select">
              {EMOJI_CHOICES.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`chip${form.photo === emoji ? ' is-selected' : ''}`}
                  onClick={() => set('photo', emoji)}
                  aria-label={`Use ${emoji} as the profile photo`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <label className="button button--small" style={{ alignSelf: 'flex-start' }}>
              📷 Upload a photo
              <input type="file" accept="image/*" className="visually-hidden" onChange={onPhotoChange} />
            </label>
          </div>
        </div>

        <Field label="Name" error={errors.name}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
              placeholder="Luna"
              autoFocus
              required
            />
          )}
        </Field>

        <div className="field-grid">
          <Field label="Age (years)" error={errors.ageYears}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                step="0.5"
                value={form.ageYears}
                onChange={(event) => set('ageYears', event.target.value)}
              />
            )}
          </Field>
          <Field label="Weight (kg)" error={errors.weightKg}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                step="0.1"
                value={form.weightKg}
                onChange={(event) => set('weightKg', event.target.value)}
              />
            )}
          </Field>
          <Field label="Meals per day" error={errors.mealsPerDay}>
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                min={0}
                max={12}
                value={form.mealsPerDay}
                onChange={(event) => set('mealsPerDay', event.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label="Food preferences" hint="Press Enter after each one.">
          {(id) => (
            <TagInput
              id={id}
              values={form.preferences}
              onChange={(values) => set('preferences', values)}
              placeholder="Wet food preferred"
            />
          )}
        </Field>

        <Field label="Dietary requirements">
          {(id) => (
            <TagInput
              id={id}
              values={form.dietaryRequirements}
              onChange={(values) => set('dietaryRequirements', values)}
              placeholder="Sensitive stomach"
            />
          )}
        </Field>

        <Field label="Favourite food" error={errors.favouriteFood}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.favouriteFood}
              onChange={(event) => set('favouriteFood', event.target.value)}
              placeholder="Royal Canin Chicken"
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
            />
          )}
        </Field>
      </form>
    </Modal>
  );
}
