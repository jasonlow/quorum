// Theme manager — toggles between paper and dusk via a body class,
// persists the choice in localStorage. Default is paper.

import { useEffect, useState } from 'react';

export type Theme = 'paper' | 'dusk';

const LS_KEY = 'quorum.theme';

function readStored(): Theme {
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v === 'paper' || v === 'dusk') return v;
  } catch { /* localStorage unavailable */ }
  return 'paper';
}

function applyToBody(theme: Theme) {
  document.body.classList.remove('theme-paper', 'theme-dusk');
  document.body.classList.add(`theme-${theme}`);
}

/**
 * Initialise the theme at app startup (call once from main.tsx)
 * so the first paint already has the right class on body.
 */
export function bootstrapTheme(): void {
  applyToBody(readStored());
}

/** React hook for the topbar toggle button. */
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } {
  const [theme, setThemeState] = useState<Theme>(readStored);

  useEffect(() => { applyToBody(theme); }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    try { window.localStorage.setItem(LS_KEY, t); } catch { /* ignore */ }
  }

  return {
    theme,
    setTheme,
    toggle: () => setTheme(theme === 'paper' ? 'dusk' : 'paper'),
  };
}
