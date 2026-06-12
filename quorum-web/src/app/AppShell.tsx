import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, Gavel, Home, Moon, ScrollText, Sun, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '@/lib/theme';

type NavEntry = { to: string; label: string; icon: LucideIcon; end?: boolean };

const SECTIONS: Array<{ heading: string; items: NavEntry[] }> = [
  {
    heading: 'Workspace',
    items: [
      { to: '/',        label: 'Dashboard', icon: Home, end: true },
      { to: '/convene', label: 'Convene',   icon: Gavel },
    ],
  },
  {
    heading: 'Manage',
    items: [
      { to: '/agents',     label: 'Agents',     icon: Users },
      { to: '/committees', label: 'Committees', icon: Building2 },
      { to: '/audit',      label: 'Audit log',  icon: ScrollText },
    ],
  },
];

/** Pages that want the wide-stage treatment (lift the global 1280px cap).
 *  Tested as regex against `location.pathname`. */
const WIDE_ROUTES = [
  /^\/sessions\/[^/]+$/,   // Boardroom (e.g. /sessions/abc-123)
];

export function AppShell() {
  const { theme, toggle } = useTheme();
  const isDusk = theme === 'dusk';
  const ToggleIcon = isDusk ? Sun : Moon;
  const location = useLocation();
  const isWide = WIDE_ROUTES.some((re) => re.test(location.pathname));

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="brand">
          <span className="mark">Quorum</span>
          <span className="ws">· Atlas Capital · Singapore</span>
        </Link>
        <div className="grow" />
        <button
          className="theme-toggle"
          onClick={toggle}
          title={`Switch to ${isDusk ? 'paper' : 'dusk'} theme`}
          aria-label={`Switch to ${isDusk ? 'paper' : 'dusk'} theme`}
        >
          <ToggleIcon size={14} strokeWidth={1.6} />
          {isDusk ? 'Paper' : 'Dusk'}
        </button>
      </header>

      <aside className="app-sidebar">
        {SECTIONS.map(section => (
          <div key={section.heading}>
            <div className="nav-section">{section.heading}</div>
            <nav>
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? 'is-active' : ''}`
                  }
                  style={{ textDecoration: 'none' }}
                >
                  <Icon size={14} strokeWidth={1.7} />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}
      </aside>

      <main className={`app-stage${isWide ? ' app-stage--wide' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
}
