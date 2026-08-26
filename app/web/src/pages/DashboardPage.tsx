import { Link } from 'react-router-dom';

import { formatDays, formatMoney, formatUnits } from '../../../shared/format.js';
import type { HouseholdNotification } from '../../../shared/types.js';
import { ActivityFeed } from '../components/ActivityFeed.js';
import { FoodItemMini } from '../components/FoodItem.js';
import { Card, EmptyState, Notice, Stat } from '../components/ui.js';
import { useData } from '../lib/app-state.js';
import { useAddToShoppingList } from '../lib/actions.js';

const NOTIFICATION_ICONS: Record<HouseholdNotification['kind'], string> = {
  low_stock: '🐱',
  expiry: '⚠️',
  reorder: '🛒',
  duplicate_purchase: 'ℹ️',
  deal: '🏷',
};

const NOTIFICATION_TONES: Record<HouseholdNotification['kind'], 'info' | 'warn' | 'danger' | 'ok'> = {
  low_stock: 'warn',
  expiry: 'warn',
  reorder: 'info',
  duplicate_purchase: 'info',
  deal: 'ok',
};

/** "Open the app. Everything is under control." (PRD §10, §24) */
export function DashboardPage() {
  const { dashboard, activity } = useData();
  const addToList = useAddToShoppingList();

  if (!dashboard) return null;

  const { totals, expiringSoon, expired, reorderSoon, recentDeals, shoppingList, notifications } =
    dashboard;
  const attention = notifications.filter((notification) => notification.priority === 1);

  return (
    <div className="stack">
      <div className="grid grid--stats">
        <Stat
          icon="🐱"
          label="Cat food"
          value={totals.unitsAvailable}
          meta={`${totals.itemsTracked} items across ${totals.catCount} cats`}
          accent
        />
        <Stat
          icon="⚠️"
          label="Expiring soon"
          value={expiringSoon.length}
          meta={expired.length > 0 ? `${expired.length} already expired` : 'Nothing past its date'}
        />
        <Stat
          icon="🛒"
          label="Reorder soon"
          value={reorderSoon.length}
          meta={
            reorderSoon[0]?.consumption.daysRemaining !== undefined &&
            reorderSoon[0]?.consumption.daysRemaining !== null
              ? `Soonest: ~${formatDays(reorderSoon[0].consumption.daysRemaining ?? 0)}`
              : 'Based on your usage'
          }
        />
        <Stat
          icon="📝"
          label="Shopping list"
          value={shoppingList.length}
          meta={shoppingList.length > 0 ? `Added by ${shoppingList[0]?.addedByName}` : 'Nothing needed'}
        />
      </div>

      {attention.length > 0 ? (
        <div className="stack stack--tight">
          {attention.map((notification) => (
            <Notice
              key={notification.id}
              tone={NOTIFICATION_TONES[notification.kind]}
              icon={NOTIFICATION_ICONS[notification.kind]}
              title={notification.title}
            >
              {notification.body}
            </Notice>
          ))}
        </div>
      ) : null}

      <div className="grid grid--halves">
        <Card
          title={<>⚠️ {expired.length > 0 ? 'Expired & expiring soon' : 'Expiring soon'}</>}
          hint="First expire, first out."
          action={
            <Link className="button button--small button--ghost" to="/inventory?expiry=expiring_soon">
              View all
            </Link>
          }
        >
          {expired.length === 0 && expiringSoon.length === 0 ? (
            <EmptyState icon="✅" title="Nothing needs using up">
              Every dated item has plenty of shelf life left.
            </EmptyState>
          ) : (
            <div className="stack stack--tight">
              {[...expired, ...expiringSoon].slice(0, 5).map((item) => (
                <FoodItemMini
                  key={item.id}
                  item={item}
                  meta={`${formatUnits(item.quantity, item.packageType)} · ${
                    item.expiryStatus === 'expired'
                      ? `expired ${formatDays(Math.abs(item.daysUntilExpiry ?? 0))} ago`
                      : `expires in ${formatDays(item.daysUntilExpiry ?? 0)}`
                  }`}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title={<>🛒 Reorder soon</>} hint="Estimated from how fast the household gets through it.">
          {reorderSoon.length === 0 ? (
            <EmptyState icon="👍" title="Nothing to reorder yet">
              Keep updating counts and predictions appear here.
            </EmptyState>
          ) : (
            <div className="stack stack--tight">
              {reorderSoon.slice(0, 5).map((item) => (
                <div key={item.id} className="row row--between">
                  <div style={{ minWidth: 0 }}>
                    <div className="strong">
                      {item.brand} {item.name}
                    </div>
                    <div className="subtle small">
                      ~{formatDays(item.consumption.daysRemaining ?? 0)} remaining ·{' '}
                      {item.consumption.orderWithinDays === 0
                        ? 'order now'
                        : `order within ${formatDays(item.consumption.orderWithinDays ?? 0)}`}
                    </div>
                  </div>
                  {item.onShoppingList ? (
                    <span className="subtle small">On the list</span>
                  ) : (
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => void addToList(item, 'low_stock')}
                    >
                      Add to list
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid--halves">
        <Card
          title={<>🏷 Recent best deals</>}
          hint="The cheapest you have paid, per unit."
          action={
            <Link className="button button--small button--ghost" to="/deals">
              Price history
            </Link>
          }
        >
          {recentDeals.length === 0 ? (
            <EmptyState icon="🧾" title="No purchases recorded yet">
              Record what you pay and the app remembers your best price.
            </EmptyState>
          ) : (
            <div className="stack stack--tight">
              {recentDeals.map(({ purchase, name, brand }) => (
                <div key={purchase.id} className="row row--between">
                  <div style={{ minWidth: 0 }}>
                    <div className="strong">{brand && !name.startsWith(brand) ? `${brand} ${name}` : name}</div>
                    <div className="subtle small">
                      Previous best: {formatMoney(purchase.totalPaid)} / {purchase.quantity} units
                      {purchase.retailer ? ` · ${purchase.retailer}` : ''}
                    </div>
                  </div>
                  <div className="numeric strong">{formatMoney(purchase.pricePerUnit)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={<>👥 Household activity</>}
          hint="Who changed what, so nobody has to ask."
          action={
            <Link className="button button--small button--ghost" to="/household">
              See all
            </Link>
          }
        >
          <ActivityFeed entries={activity} limit={7} />
        </Card>
      </div>
    </div>
  );
}
