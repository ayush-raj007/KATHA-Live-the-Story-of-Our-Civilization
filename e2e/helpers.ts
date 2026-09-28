import type { Page } from '@playwright/test';

type StoreState = Record<string, unknown> & {
  playerPosition: { x: number; y: number; isMoving: boolean };
  urja: number;
  activeScreen: string;
  activeQuest: { currentStepIndex: number } | null;
  overlayCount: number;
  isPaused: boolean;
};

/** Collects console errors/warnings and uncaught page errors. */
export const trackConsole = (page: Page) => {
  const problems: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));
  return problems;
};

/** Opens the game with a fresh save. */
export const openFreshGame = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => '__gameStore' in window);
};

export const getState = (page: Page): Promise<StoreState> =>
  page.evaluate(() => {
    const store = (window as unknown as { __gameStore: { getState: () => Record<string, unknown> } }).__gameStore;
    // Drop functions so the state can be serialised back to the test.
    return JSON.parse(JSON.stringify(store.getState()));
  });

export const setState = (page: Page, partial: Record<string, unknown>) =>
  page.evaluate((p) => {
    const store = (window as unknown as { __gameStore: { setState: (s: Record<string, unknown>) => void } }).__gameStore;
    store.setState(p);
  }, partial);

/** Enters Lothal through the Kaal Map portal ("Quick Spin & Enter"). */
export const enterLothal = async (page: Page) => {
  await page.getByRole('button', { name: /Spin Top & Enter Lothal/ }).click();
  await page.getByRole('button', { name: /Quick Spin & Enter/ }).click();
  await page.waitForFunction(() => {
    const store = (window as unknown as { __gameStore: { getState: () => { activeScreen: string } } }).__gameStore;
    return store.getState().activeScreen === 'kingdom';
  });
};
