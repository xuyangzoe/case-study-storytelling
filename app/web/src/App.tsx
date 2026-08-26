import { NavLink, Navigate, Route, Routes } from 'react-router-dom';

import { ToastStack } from './components/ui.js';
import { useData, useSession } from './lib/app-state.js';
import { CatsPage } from './pages/CatsPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { DealsPage } from './pages/DealsPage.js';
import { HouseholdPage } from './pages/HouseholdPage.js';
import { InventoryPage } from './pages/InventoryPage.js';
import { ShoppingPage } from './pages/ShoppingPage.js';
import { WelcomePage } from './pages/WelcomePage.js';

interface NavItem {
  to: string;
  label: string;
  short: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', short: 'Home', icon: '🏠' },
  { to: '/inventory', label: 'Inventory', short: 'Food', icon: '🥫' },
  { to: '/cats', label: 'Cats', short: 'Cats', icon: '🐈' },
  { to: '/shopping', label: 'Shopping list', short: 'Shop', icon: '🛒' },
  { to: '/deals', label: 'Deals & prices', short: 'Deals', icon: '🏷' },
  { to: '/household', label: 'Household', short: 'People', icon: '👥' },
];

export function App() {
  const { user, household, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="welcome">
        <div className="center muted">Loading your household…</div>
      </div>
    );
  }

  if (!user || !household) return <WelcomePage />;

  return <AppShell />;
}

function AppShell() {
  const { household } = useSession();
  const { shopping, dashboard, loading } = useData();

  const shoppingCount = shopping.filter((entry) => entry.status === 'needed').length;
  const attentionCount = (dashboard?.notifications ?? []).filter((n) => n.priority === 1).length;

  const countFor = (to: string): number =>
    to === '/shopping' ? shoppingCount : to === '/' ? attentionCount : 0;

  return (
    <div className="shell">
      {loading ? <div className="loading-bar" aria-hidden="true" /> : null}

      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            🐾
          </span>
          MultiCat
        </div>

        <div className="household-chip">
          <div className="household-chip__label">Household</div>
          <div className="household-chip__name">{household?.name}</div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
            >
              <span className="nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
              {countFor(item.to) > 0 ? <span className="nav__count">{countFor(item.to)}</span> : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span className="small">One shared inventory for the whole household.</span>
        </div>
      </aside>

      <div>
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              🐾
            </span>
            {household?.name}
          </div>
        </header>

        <main className="main">
          <div className="main__inner">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/cats" element={<CatsPage />} />
              <Route path="/shopping" element={<ShoppingPage />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/household" element={<HouseholdPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <nav className="tabbar">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `tabbar__link${isActive ? ' is-active' : ''}`}
          >
            <span className="tabbar__icon" aria-hidden="true">
              {item.icon}
              {countFor(item.to) > 0 ? <span className="tabbar__dot">{countFor(item.to)}</span> : null}
            </span>
            {item.short}
          </NavLink>
        ))}
      </nav>

      <ToastStack />
    </div>
  );
}
