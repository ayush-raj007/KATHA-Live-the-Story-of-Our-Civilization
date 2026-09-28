import { expect, test, type Page } from '@playwright/test';
import { enterLothal, getState, openFreshGame, setState, trackConsole } from './helpers.ts';

const WORLD = { width: 760, height: 560 };
const NPC = {
  somendra: { x: 480, y: 180 },
  marak: { x: 180, y: 280 },
  revati: { x: 340, y: 420 },
};

/** Clicks a point given in world coordinates on the kingdom canvas. */
const clickWorld = async (page: Page, point: { x: number; y: number }) => {
  const canvas = page.locator('canvas').first();
  const box = (await canvas.boundingBox())!;
  const border = await canvas.evaluate((c) => (c.getBoundingClientRect().width / (c as HTMLCanvasElement).offsetWidth) * c.clientLeft);
  await page.mouse.click(
    box.x + border + (point.x / WORLD.width) * (box.width - border * 2),
    box.y + border + (point.y / WORLD.height) * (box.height - border * 2)
  );
};

const questStep = async (page: Page) => (await getState(page)).activeQuest?.currentStepIndex;

const closeDialog = (page: Page) => page.locator('.modal-content-card button:has(svg.lucide-x)').first().click();

const claimVictory = async (page: Page) => {
  await expect(page.getByText('CHAMPION CONQUERED!')).toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: /Claim Victory/ }).click();
};

// ---- Mini-game players: they watch the real game UI and give real input ----

const playBeadDriller = async (page: Page) => {
  await page.getByRole('button', { name: /Begin Contest/ }).click();
  // Press Space whenever the needle is inside the green target zone.
  await page.evaluate(() => {
    const needle = [...document.querySelectorAll<HTMLElement>('div')].find(
      (d) => d.style.background === 'rgb(43, 58, 103)' && d.style.width === '4px'
    )!;
    let last = 0;
    const tick = (now: number) => {
      if (!needle.isConnected) return;
      const pos = parseFloat(needle.style.left);
      if (Math.abs(pos - 50) <= 5 && now - last > 250) {
        last = now;
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space' }));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await claimVictory(page);
};

const playTideDock = async (page: Page) => {
  await page.getByRole('button', { name: /Begin Contest/ }).click();
  // Launch while the tide is rising through 12-40%, so the ship arrives (~1s later) at high tide.
  await page.evaluate(() => {
    const water = [...document.querySelectorAll<HTMLElement>('div')].find((d) =>
      d.style.background.includes('rgb(92, 148, 178)')
    )!;
    let prev = parseFloat(water.style.height);
    const tick = () => {
      if (!water.isConnected) return;
      const level = parseFloat(water.style.height);
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('LAUNCH INTO DOCK'));
      if (button && !button.disabled && level > prev && level >= 12 && level <= 40) button.click();
      prev = level;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await claimVictory(page);
};

const playSealMatch = async (page: Page) => {
  await page.getByRole('button', { name: /Begin Contest/ }).click();
  const cards = page.locator('[role="button"][aria-label]');
  await expect(cards).toHaveCount(12);
  const seen = new Map<string, number[]>();
  // Learn every card by flipping neighbours, then match pairs from memory.
  for (let i = 0; i < 12; i += 2) {
    for (const idx of [i, i + 1]) {
      await cards.nth(idx).click();
      const name = (await cards.nth(idx).getAttribute('aria-label'))!;
      seen.set(name, [...(seen.get(name) ?? []), idx]);
    }
    await page.waitForTimeout(850);
  }
  for (const [a, b] of seen.values()) {
    const matched = await cards.nth(a).evaluate((el) => el.style.borderColor.includes('76, 175, 80'));
    if (matched) continue;
    await cards.nth(a).click();
    await cards.nth(b).click();
  }
  await claimVictory(page);
};

test.describe('Katha: Kaal Yatri', () => {
  test('boots without console errors or warnings', async ({ page }) => {
    const problems = trackConsole(page);
    await openFreshGame(page);
    await expect(page.getByText('Kaal Map of Bharat')).toBeVisible();
    await page.waitForTimeout(500);
    expect(problems).toEqual([]);
  });

  test('full Lothal quest playthrough', async ({ page }) => {
    test.setTimeout(180_000);
    const problems = trackConsole(page);
    await openFreshGame(page);
    await enterLothal(page);
    expect(await questStep(page)).toBe(0);

    // Step 0 -> 1: meet Somendra, then take on his Bead Driller challenge
    await clickWorld(page, NPC.somendra);
    await expect(page.getByRole('heading', { name: /Somendra/ })).toBeVisible();
    expect(await questStep(page)).toBe(1);
    await page.getByRole('button', { name: /Challenge Champion/ }).click();
    await playBeadDriller(page);
    expect(await questStep(page)).toBe(2);

    // Step 2 -> 3: barter beads with Marak (the ship no longer steals clicks on him)
    await clickWorld(page, NPC.marak);
    await expect(page.getByRole('heading', { name: /Marak/ })).toBeVisible();
    await page.getByRole('button', { name: /Barter Rations/ }).click();
    await page.getByRole('button', { name: /Trade & Acquire/ }).first().click();
    expect(await questStep(page)).toBe(3);

    // Step 3 -> 4: Tide Dock
    await page.getByRole('button', { name: /Conversation/ }).click();
    await page.getByRole('button', { name: /Challenge Champion/ }).click();
    await playTideDock(page);
    expect(await questStep(page)).toBe(4);

    // Step 4 -> 5: Seal Match with Revati (must not skip the cargo step)
    await clickWorld(page, NPC.revati);
    await page.getByRole('button', { name: /Challenge Champion/ }).click();
    await playSealMatch(page);
    expect(await questStep(page)).toBe(5);

    // Step 5 -> 6: cargo decision via Marak
    await clickWorld(page, NPC.marak);
    await page.getByRole('button', { name: /Sagar Doot Cargo Consignment/ }).click();
    await page.locator('.modal-content-card strong').first().click();
    await page.getByRole('button', { name: /Continue Exploration/ }).click();
    expect(await questStep(page)).toBe(6);

    // Step 6 -> done: inspect the bull in Kaal Ghar and claim the shard
    await page.getByRole('button', { name: /Kaal Ghar/ }).first().click();
    await page.getByRole('button', { name: /Inspect in 3D/ }).first().click();
    await page.getByRole('button', { name: /CLAIM LOTHAL KAAL SHARD/ }).click();
    await expect(page.getByText('Lothal Kaal Shard Restored to Spinning Top!')).toBeVisible();
    const state = await getState(page);
    expect(state.activeQuest?.currentStepIndex).toBe(7);
    expect((state.activeQuest as unknown as { isComplete: boolean }).isComplete).toBe(true);
    await closeDialog(page);
    // Closing the viewer keeps the player in Kaal Ghar
    await expect(page.getByText('Kaal Ghar (Home Base)')).toBeVisible();

    expect(problems).toEqual([]);
  });

  test('movement uses real time, stops on blur, and pauses behind dialogs', async ({ page }) => {
    await openFreshGame(page);
    await enterLothal(page);

    // ~3.5px per 60fps frame = ~210px/s regardless of the display refresh rate
    const x0 = (await getState(page)).playerPosition.x;
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);
    const moved = (await getState(page)).playerPosition.x - x0;
    expect(moved).toBeGreaterThan(150);
    expect(moved).toBeLessThan(280);

    // Losing focus while a key is held must not leave the player walking
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(150);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await page.waitForTimeout(200);
    const afterBlur = (await getState(page)).playerPosition.x;
    await page.waitForTimeout(400);
    expect((await getState(page)).playerPosition.x).toBe(afterBlur);
    await page.keyboard.up('ArrowLeft');

    // An open dialogue pauses movement
    await clickWorld(page, NPC.revati);
    await expect(page.getByRole('heading', { name: /Revati/ })).toBeVisible();
    expect((await getState(page)).overlayCount).toBeGreaterThan(0);
    const before = (await getState(page)).playerPosition;
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(400);
    await page.keyboard.up('ArrowDown');
    expect((await getState(page)).playerPosition).toEqual(before);
    await closeDialog(page);
    expect((await getState(page)).overlayCount).toBe(0);
  });

  test('click-to-move walks to the target instead of teleporting', async ({ page }) => {
    await openFreshGame(page);
    await enterLothal(page);
    const start = (await getState(page)).playerPosition;
    await clickWorld(page, { x: 600, y: 480 });
    await page.waitForTimeout(150);
    const mid = await page.evaluate(() => {
      const pin = [...document.querySelectorAll<HTMLElement>('div')].find((d) => d.style.background === 'rgb(43, 58, 103)' && d.style.width === '8px')!;
      return parseFloat(pin.style.left);
    });
    expect(mid).toBeGreaterThan((start.x / 760) * 100);
    expect(mid).toBeLessThan((600 / 760) * 100 - 5);
    await page.waitForTimeout(2500);
    const end = (await getState(page)).playerPosition;
    // Within a couple of pixels of the target (screen-to-world rounding)
    expect(Math.abs(end.x - 600)).toBeLessThan(3);
    expect(Math.abs(end.y - 480)).toBeLessThan(3);
  });

  test('survives input spam, rapid navigation and restarts without errors', async ({ page }) => {
    test.setTimeout(120_000);
    const problems = trackConsole(page);
    await openFreshGame(page);
    await enterLothal(page);

    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: /Kaal Ghar/ }).first().click();
      await page.getByRole('button', { name: /Return to Lothal/ }).click();
    }
    for (const key of ['e', ' ', 'Enter', 'w', 'a', 's', 'd']) {
      for (let i = 0; i < 10; i++) await page.keyboard.press(key);
    }

    // Spam the drill button, then quit mid-game; the game must unpause afterwards
    await clickWorld(page, NPC.somendra);
    await page.getByRole('button', { name: /Challenge Champion/ }).click();
    await page.getByRole('button', { name: /Begin Contest/ }).click();
    for (let i = 0; i < 30; i++) await page.keyboard.press('Space');
    await closeDialog(page);
    await page.waitForTimeout(1500);
    const s = await getState(page);
    expect(s.activeScreen).toBe('kingdom');
    expect(s.isPaused).toBe(false);
    expect(s.overlayCount).toBe(0);

    // Rapid restarts keep the save and boot cleanly
    for (let i = 0; i < 3; i++) await page.reload();
    await page.waitForFunction(() => '__gameStore' in window);
    expect(problems).toEqual([]);
  });

  test('Kaal Thakaan (Urja 0) returns to Kaal Ghar and resumes cleanly', async ({ page }) => {
    const problems = trackConsole(page);
    await openFreshGame(page);
    await enterLothal(page);
    await setState(page, { urja: 10 });
    await clickWorld(page, NPC.revati);
    await page.getByRole('button', { name: /Knowledge Check/ }).click();
    // Pick a wrong answer (the correct one is highlighted green after answering)
    const options = page.locator('.modal-content-card h3 + div > button');
    await options.nth(2).click();
    await expect(page.getByText('Kaal Thakaan (Temporal Fatigue)')).toBeVisible();
    await page.getByRole('button', { name: /Resume Journey in Lothal/ }).click();
    const s = await getState(page);
    expect(s.activeScreen).toBe('kingdom');
    expect(s.urja).toBe(50);
    expect(s.isPaused).toBe(false);
    expect(problems).toEqual([]);
  });
});

test.describe('layout', () => {
  const SIZES = [
    { name: 'mobile 320', width: 320, height: 640 },
    { name: 'tablet 768', width: 768, height: 1024 },
    { name: 'desktop 1080p', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 },
  ];

  for (const size of SIZES) {
    test(`controls fit and are clickable at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      const problems = trackConsole(page);
      await openFreshGame(page);

      // Nothing in the HUD may spill off-screen
      const hudOverflow = await page.evaluate(() =>
        [...document.querySelectorAll('.hud-header *')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < 0 || r.right > window.innerWidth + 0.5);
        }).length
      );
      expect(hudOverflow).toBe(0);

      // Primary actions are not covered by the HUD or companion bubble
      await page.getByRole('button', { name: /Spin Top & Enter Lothal/ }).click({ trial: true });
      await enterLothal(page);

      const canvas = (await page.locator('canvas').first().boundingBox())!;
      expect(canvas.x).toBeGreaterThanOrEqual(0);
      expect(canvas.x + canvas.width).toBeLessThanOrEqual(size.width);
      expect(canvas.y + canvas.height).toBeLessThanOrEqual(size.height);

      await page.getByRole('button', { name: /Kaal Ghar/ }).first().click();
      for (const tab of [/Knowledge Journal/, /DIY Blueprints/, /Return to Lothal/]) {
        await page.getByRole('button', { name: tab }).click({ trial: true });
      }
      expect(problems).toEqual([]);
    });
  }
});
