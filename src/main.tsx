import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import App from './App.tsx';
import { useGameStore } from './store/useGameStore';

// Lets the Playwright tests read and set game state. Dev server only.
if (import.meta.env.DEV) {
  (window as unknown as { __gameStore: typeof useGameStore }).__gameStore = useGameStore;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
