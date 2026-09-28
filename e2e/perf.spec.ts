import { test } from '@playwright/test';
import { enterLothal, openFreshGame } from './helpers.ts';

// Opt-in profiling run: PERF=1 npx playwright test perf
// Holds movement keys in the kingdom under 4x CPU throttling and prints CDP metrics.
test.skip(!process.env.PERF, 'set PERF=1 to run the profiling pass');

test('kingdom game loop cost while walking', async ({ page }) => {
  await openFreshGame(page);
  await enterLothal(page);
  await page.getByText('Namaste Yatri').waitFor().catch(() => {});

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  await page.evaluate(() => {
    const w = window as unknown as { __frames: number };
    w.__frames = 0;
    const tick = () => { w.__frames++; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });

  const metric = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
  };

  const measure = async (label: string, action: () => Promise<void>) => {
    const before = await metric();
    const framesBefore = await page.evaluate(() => (window as unknown as { __frames: number }).__frames);
    const start = Date.now();
    await action();
    const seconds = (Date.now() - start) / 1000;
    const after = await metric();
    const frames = (await page.evaluate(() => (window as unknown as { __frames: number }).__frames)) - framesBefore;
    const d = (k: string) => after[k] - before[k];
    console.log(
      `[perf] ${label}: fps=${(frames / seconds).toFixed(1)} ` +
      `script=${(d('ScriptDuration') * 1000 / seconds).toFixed(0)}ms/s ` +
      `task=${(d('TaskDuration') * 1000 / seconds).toFixed(0)}ms/s ` +
      `layouts=${(d('LayoutCount') / seconds).toFixed(1)}/s ` +
      `styleRecalcs=${(d('RecalcStyleCount') / seconds).toFixed(1)}/s ` +
      `heap=${(after.JSHeapUsedSize / 1e6).toFixed(1)}MB`
    );
  };

  await measure('idle', () => page.waitForTimeout(3000));
  await measure('walking', async () => {
    for (const key of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(1000);
      await page.keyboard.up(key);
    }
  });
});
