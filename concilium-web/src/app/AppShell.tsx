import { Link, NavLink, Outlet } from 'react-router-dom';

const NAV: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/',       label: 'Dashboard', end: true },
  { to: '/agents', label: 'Agents' },
  { to: '/audit',  label: 'Audit log' },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="mark">Concilium</span>
          <span className="ws">· Atlas Capital · Singapore</span>
        </Link>
        <div className="grow" />
        <nav className="row gap-2">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => `chip ${isActive ? 'chip-on' : ''}`}
              style={{ textDecoration: 'none' }}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="app-stage">
        <Outlet />
      </main>
    </div>
  );
}
