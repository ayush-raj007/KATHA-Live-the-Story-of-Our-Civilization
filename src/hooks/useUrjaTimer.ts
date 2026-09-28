import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Hook to manage passive Urja drain (-1 every 20s of active exploration)
 * Paused during dialogue, menus, mini-games, and when in Kaal Ghar / Kaal Map.
 */
export const useUrjaTimer = () => {
  const drainUrjaPassive = useGameStore((state) => state.drainUrjaPassive);
  const activeScreen = useGameStore((state) => state.activeScreen);
  const isPaused = useGameStore((state) => state.isPaused);
  const isKaalThakaanTriggered = useGameStore((state) => state.isKaalThakaanTriggered);

  useEffect(() => {
    // Only drain actively in the kingdom exploration screen when not paused
    if (activeScreen !== 'kingdom' || isPaused || isKaalThakaanTriggered) {
      return;
    }

    const interval = setInterval(() => {
      drainUrjaPassive();
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [drainUrjaPassive, activeScreen, isPaused, isKaalThakaanTriggered]);
};
