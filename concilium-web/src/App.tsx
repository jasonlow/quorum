import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './app/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Convene } from './pages/Convene';
import { Boardroom } from './pages/Boardroom';
import { BriefPage } from './pages/Brief';
import { SessionComplete } from './pages/SessionComplete';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/convene" element={<Convene />} />
          <Route path="/sessions/:id" element={<Boardroom />} />
          <Route path="/sessions/:id/brief" element={<BriefPage />} />
          <Route path="/sessions/:id/complete" element={<SessionComplete />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
