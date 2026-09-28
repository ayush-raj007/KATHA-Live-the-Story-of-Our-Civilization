import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BeadDriller } from './BeadDriller';
import { TideDock } from './TideDock';
import { SealMatch } from './SealMatch';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// Advance in small steps so React renders between timer ticks, as it would in a browser.
const advance = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 100) {
    act(() => { vi.advanceTimersByTime(Math.min(100, ms - elapsed)); });
  }
};
const callbacks = () => ({ onFinish: vi.fn(), onFail: vi.fn() });
const resultCount = (cb: ReturnType<typeof callbacks>) =>
  cb.onFinish.mock.calls.length + cb.onFail.mock.calls.length;

describe('BeadDriller', () => {
  // With fake timers the needle never leaves the centre, so every tap is a perfect hit.
  const drillButton = () => screen.getByRole('button', { name: /drill tap/i });
  const scoreText = () => screen.getByText(/^Score:/).textContent;

  it('counts the final tap that completes the bead (score and depth are not stale)', () => {
    const cb = callbacks();
    render(<BeadDriller {...cb} />);
    for (let i = 0; i < 6; i++) fireEvent.click(drillButton());

    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).toHaveBeenCalledWith(3, 450);
  });

  it('reports a time-out exactly once, without render-phase update warnings', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cb = callbacks();
    render(<StrictMode><BeadDriller {...cb} /></StrictMode>);
    for (let i = 0; i < 4; i++) fireEvent.click(drillButton()); // 50+60+70+80 = 260

    advance(46_000);

    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).toHaveBeenCalledWith(1, 260);
    expect(cb.onFail).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores auto-repeat key events from a held key', () => {
    render(<BeadDriller {...callbacks()} />);
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    for (let i = 0; i < 5; i++) fireEvent.keyDown(window, { key: ' ', code: 'Space', repeat: true });

    expect(scoreText()).toBe('Score: 50');
  });

  it('does not report a result after it has been closed', () => {
    const cb = callbacks();
    const { unmount } = render(<BeadDriller {...cb} />);
    unmount();
    advance(60_000);
    expect(resultCount(cb)).toBe(0);
  });
});

describe('TideDock', () => {
  const SHIP_TRIP_MS = 1_000; // ship arrives after ~960ms
  const launch = () => {
    fireEvent.keyDown(window, { key: 'Enter' });
    advance(SHIP_TRIP_MS);
  };

  it('plays all 4 fleets and reports exactly once, even with extra launches and StrictMode', () => {
    const cb = callbacks();
    render(<StrictMode><TideDock {...cb} /></StrictMode>);
    for (let i = 0; i < 4; i++) launch();
    launch();
    launch();
    advance(3_000);

    expect(resultCount(cb)).toBe(1);
  });

  it('does not report a result after being closed during the end-of-game delay', () => {
    const cb = callbacks();
    const { unmount } = render(<TideDock {...cb} />);
    for (let i = 0; i < 4; i++) launch();
    unmount();
    advance(3_000);

    expect(resultCount(cb)).toBe(0);
  });

  it('shows progress out of all 4 fleets', () => {
    render(<TideDock {...callbacks()} />);
    expect(screen.getByText(/Docked Ships:/).textContent).toContain('/ 4');
  });
});

describe('SealMatch', () => {
  it('reports a time-out exactly once in StrictMode', () => {
    const cb = callbacks();
    render(<StrictMode><SealMatch {...cb} /></StrictMode>);
    advance(57_000);
    expect(cb.onFail).toHaveBeenCalledTimes(1);
    expect(cb.onFinish).not.toHaveBeenCalled();
  });

  it('does not report a result after being closed during the end-of-game delay', () => {
    const cb = callbacks();
    const { unmount } = render(<SealMatch {...cb} />);
    advance(55_000);
    unmount();
    advance(2_000);
    expect(resultCount(cb)).toBe(0);
  });

  it('awards 3 stars for matching all pairs in under 45 seconds, regardless of errors', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const cb = callbacks();
    render(<SealMatch {...cb} />);
    const cards = () => screen.getAllByRole('button');
    const seen = new Map<string, number[]>();

    // First pass: flip neighbours to learn every card (each pair here is a mismatch).
    for (let i = 0; i < 12; i += 2) {
      fireEvent.click(cards()[i]);
      fireEvent.click(cards()[i + 1]);
      for (const idx of [i, i + 1]) {
        const name = cards()[idx].getAttribute('aria-label')!;
        seen.set(name, [...(seen.get(name) ?? []), idx]);
      }
      advance(800);
    }
    // Second pass: match every pair from memory.
    for (const [a, b] of seen.values()) {
      fireEvent.click(cards()[a]);
      fireEvent.click(cards()[b]);
    }
    advance(1_000);

    expect(cb.onFinish).toHaveBeenCalledTimes(1);
    expect(cb.onFinish.mock.calls[0][0]).toBe(3);
  });
});
