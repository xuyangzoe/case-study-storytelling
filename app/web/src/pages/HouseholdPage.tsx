import { useState } from 'react';

import type { HouseholdNotification } from '../../../shared/types.js';
import { ActivityFeed } from '../components/ActivityFeed.js';
import { Card, EmptyState, Field, Notice } from '../components/ui.js';
import { api } from '../lib/api.js';
import { useData, useSession, useToast } from '../lib/app-state.js';

const NOTIFICATION_ICONS: Record<HouseholdNotification['kind'], string> = {
  low_stock: '🐱',
  expiry: '⚠️',
  reorder: '🛒',
  duplicate_purchase: 'ℹ️',
  deal: '🏷',
};

/** Household setup (PRD §7), the activity record (§11) and notifications (§18). */
export function HouseholdPage() {
  const { household, user, setHousehold, signOut } = useSession();
  const { activity, dashboard, refresh } = useData();
  const { push } = useToast();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(household?.name ?? '');

  if (!household) return null;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(household.inviteCode);
      push('success', 'Invite code copied');
    } catch {
      push('info', `Invite code: ${household.inviteCode}`);
    }
  };

  const rotate = async () => {
    if (!window.confirm('Generate a new code? The old one stops working.')) return;
    const result = await api.rotateInviteCode();
    setHousehold(result.household);
    push('success', 'New invite code generated');
  };

  const rename = async () => {
    const result = await api.renameHousehold({ name });
    setHousehold(result.household);
    setRenaming(false);
    await refresh();
    push('success', 'Household renamed');
  };

  const leave = async () => {
    if (!window.confirm('Leave this household? You will need an invite code to come back.')) return;
    await api.leaveHousehold();
    setHousehold(null);
  };

  const notifications = dashboard?.notifications ?? [];

  return (
    <div className="stack">
      <div className="page-header">
        <div className="page-header__title">
          <h1>{household.name}</h1>
          <span className="page-header__subtitle">
            {household.members.length} {household.members.length === 1 ? 'member' : 'members'} sharing one
            inventory
          </span>
        </div>
        <button type="button" className="button button--small" onClick={() => setRenaming((value) => !value)}>
          Rename
        </button>
      </div>

      {renaming ? (
        <Card>
          <div className="row">
            <Field label="Household name">
              {(id) => (
                <input id={id} className="input" value={name} onChange={(event) => setName(event.target.value)} />
              )}
            </Field>
            <button type="button" className="button button--primary" onClick={() => void rename()}>
              Save
            </button>
          </div>
        </Card>
      ) : null}

      <div className="grid grid--halves">
        <Card title={<>👥 Members</>} hint="Everyone sees and edits the same inventory.">
          <div className="stack stack--tight">
            {household.members.map((member) => (
              <div key={member.userId} className="row row--between">
                <div>
                  <div className="strong">
                    {member.name}
                    {member.userId === user?.id ? <span className="subtle"> · you</span> : null}
                  </div>
                  <div className="subtle small">{member.email}</div>
                </div>
                <span className="subtle small">{member.role === 'owner' ? 'Owner' : 'Member'}</span>
              </div>
            ))}
          </div>

          <div className="stack stack--tight" style={{ marginTop: 16 }}>
            <span className="cat-card__label">Invite someone</span>
            <div className="row">
              <span className="invite-code">{household.inviteCode}</span>
              <button type="button" className="button button--small" onClick={() => void copyInvite()}>
                Copy
              </button>
              <button type="button" className="button button--small button--ghost" onClick={() => void rotate()}>
                New code
              </button>
            </div>
            <p className="subtle small">
              They sign in, choose “Join with a code”, and the whole inventory is theirs too.
            </p>
          </div>
        </Card>

        <Card title={<>🔔 Notifications</>} hint="Actionable, not noisy.">
          {notifications.length === 0 ? (
            <EmptyState icon="🎉" title="Nothing needs your attention">
              Stock levels, expiry dates and reorder timing all look fine.
            </EmptyState>
          ) : (
            <div className="stack stack--tight">
              {notifications.map((notification) => (
                <Notice
                  key={notification.id}
                  tone={notification.priority === 1 ? 'warn' : 'info'}
                  icon={NOTIFICATION_ICONS[notification.kind]}
                  title={notification.title}
                >
                  {notification.body}
                </Notice>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title={<>📋 Activity</>} hint="Every change, and who made it.">
        <ActivityFeed entries={activity} />
      </Card>

      <Card>
        <div className="row row--between">
          <div>
            <div className="strong">Signed in as {user?.name}</div>
            <div className="subtle small">{user?.email}</div>
          </div>
          <div className="row">
            <button type="button" className="button button--small" onClick={() => void signOut()}>
              Sign out
            </button>
            <button type="button" className="button button--small button--danger" onClick={() => void leave()}>
              Leave household
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
