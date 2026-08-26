import { useState, type FormEvent } from 'react';

import { api, ApiError } from '../lib/api.js';
import { useSession } from '../lib/app-state.js';
import { Field, Notice } from '../components/ui.js';

/** Sign in, then create or join the shared household (PRD §7). */
export function WelcomePage() {
  const { user } = useSession();
  return (
    <div className="welcome">
      <div className="welcome__panel">
        <div className="welcome__brand">
          <span aria-hidden="true">🐾</span> MultiCat
        </div>
        <p className="welcome__tagline">
          Know what your cats have, what they need, and when to buy it — without the mental load.
        </p>
        {user ? <HouseholdStep /> : <SignInStep />}
      </div>
    </div>
  );
}

function SignInStep() {
  const { signIn } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ name, email });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      <Field label="Your name" hint="Household members see this next to your inventory changes.">
        {(id) => (
          <input
            id={id}
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Yang"
            autoFocus
            required
          />
        )}
      </Field>
      <Field label="Email">
        {(id) => (
          <input
            id={id}
            className="input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        )}
      </Field>
      {error ? <Notice tone="danger" icon="⚠️">{error}</Notice> : null}
      <button type="submit" className="button button--primary button--block" disabled={busy}>
        {busy ? 'Just a moment…' : 'Continue'}
      </button>
      <p className="subtle small center">
        This demo signs you in with a name and email only — no password to set up.
      </p>
    </form>
  );
}

function HouseholdStep() {
  const { user, setHousehold, signOut } = useSession();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [householdName, setHouseholdName] = useState(user ? `${user.name}'s Cat Household` : '');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === 'create'
          ? await api.createHousehold({ name: householdName })
          : await api.joinHousehold({ inviteCode });
      setHousehold(result.household);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Something went wrong — please try again',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack">
      <div className="welcome__switch" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'create'}
          className={mode === 'create' ? 'is-active' : ''}
          onClick={() => setMode('create')}
        >
          Create a household
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'join'}
          className={mode === 'join' ? 'is-active' : ''}
          onClick={() => setMode('join')}
        >
          Join with a code
        </button>
      </div>

      <form className="stack" onSubmit={submit}>
        {mode === 'create' ? (
          <Field label="Household name" hint="You can invite the rest of the household next.">
            {(id) => (
              <input
                id={id}
                className="input"
                value={householdName}
                onChange={(event) => setHouseholdName(event.target.value)}
                required
              />
            )}
          </Field>
        ) : (
          <Field label="Invite code" hint="Ask whoever set up the household for the six-character code.">
            {(id) => (
              <input
                id={id}
                className="input"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                placeholder="LUNA26"
                style={{ letterSpacing: '0.16em', fontWeight: 700 }}
                required
              />
            )}
          </Field>
        )}

        {error ? <Notice tone="danger" icon="⚠️">{error}</Notice> : null}

        <button type="submit" className="button button--primary button--block" disabled={busy}>
          {busy ? 'Setting things up…' : mode === 'create' ? 'Create household' : 'Join household'}
        </button>
      </form>

      <button type="button" className="button button--ghost" onClick={() => void signOut()}>
        Sign in as someone else
      </button>
    </div>
  );
}
