import { afterEach, describe, expect, it, vi } from 'vitest';
import { sound } from './audio';
import { useGameStore } from '../store/useGameStore';

describe('sound', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useGameStore.setState({ soundEnabled: true });
  });

  it('stays silent when sound is turned off, even for callers that do not check the setting', () => {
    const ctor = vi.fn();
    vi.stubGlobal('AudioContext', ctor);
    useGameStore.setState({ soundEnabled: false });

    sound.playCorrect();
    sound.playWrong();
    sound.playDrillTap();
    sound.playTopSpin();

    expect(ctor).not.toHaveBeenCalled();
  });
});
