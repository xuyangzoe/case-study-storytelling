import { formatRelativeTime } from '../../../shared/format.js';
import type { ActivityEntry } from '../../../shared/types.js';
import { EmptyState } from './ui.js';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** "Yang · Used 2 cans · 10:32 AM" — accountability without a group chat (PRD §11). */
export function ActivityFeed({ entries, limit }: { entries: ActivityEntry[]; limit?: number }) {
  const visible = limit ? entries.slice(0, limit) : entries;

  if (visible.length === 0) {
    return (
      <EmptyState icon="📋" title="Nothing has happened yet">
        Inventory changes, purchases and shopping-list updates by any member show up here.
      </EmptyState>
    );
  }

  return (
    <div className="feed">
      {visible.map((entry) => (
        <div key={entry.id} className="feed__entry">
          <div className="feed__avatar" aria-hidden="true">
            {initials(entry.actorName)}
          </div>
          <div className="feed__text">
            {entry.summary}
            {entry.delta !== null ? (
              <>
                {' '}
                <span className={`feed__delta feed__delta--${entry.delta > 0 ? 'up' : 'down'}`}>
                  {entry.delta > 0 ? '+' : ''}
                  {entry.delta}
                </span>
              </>
            ) : null}
          </div>
          <time className="feed__time" dateTime={entry.at}>
            {formatRelativeTime(entry.at)}
          </time>
        </div>
      ))}
    </div>
  );
}
