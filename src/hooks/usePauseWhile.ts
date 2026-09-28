import { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';

/**
 * Pauses exploration (movement and passive Urja drain) while `active` is true,
 * e.g. while a dialogue, bag or card overlay is open. Overlays are counted, so
 * stacked overlays keep the game paused until the last one closes.
 */
export const usePauseWhile = (active: boolean) => {
  const pushOverlay = useGameStore((state) => state.pushOverlay);
  const popOverlay = useGameStore((state) => state.popOverlay);

  useEffect(() => {
    if (!active) return;
    pushOverlay();
    return popOverlay;
  }, [active, pushOverlay, popOverlay]);
};
