import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/pro-styles.css';
import './styles/app.css';
import { App } from './App';
import { bootstrapTheme } from './lib/theme';

// Apply the persisted theme BEFORE the first paint so dusk users
// don't get a flash of paper on cold load.
bootstrapTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
