import { Link, Outlet } from 'react-router-dom';

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <span className="mark">Concilium</span>
          <span className="ws">· Atlas Capital · Singapore</span>
        </Link>
        <div className="grow" />
        <Link to="/" className="t-tiny" style={{ textDecoration: 'none' }}>
          Dashboard
        </Link>
      </header>
      <main className="app-stage">
        <Outlet />
      </main>
    </div>
  );
}
