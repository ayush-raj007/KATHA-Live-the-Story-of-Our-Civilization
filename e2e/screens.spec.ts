import { test } from '@playwright/test';
import { enterLothal, openFreshGame } from './helpers.ts';

// Opt-in: SCREENS=1 npx playwright test screens — saves layout screenshots for review.
test.skip(!process.env.SCREENS, 'set SCREENS=1 to capture layout screenshots');

const SIZES = [
  { name: 'mobile-320', width: 320, height: 640 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1080p', width: 1920, height: 1080 },
  { name: 'uhd-4k', width: 3840, height: 2160 },
];

for (const size of SIZES) {
  test(`screens ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openFreshGame(page);
    await page.screenshot({ path: `test-results/screens/${size.name}-map.png` });
    await enterLothal(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `test-results/screens/${size.name}-kingdom.png` });
    await page.getByRole('button', { name: /Kaal Ghar/ }).first().click();
    await page.screenshot({ path: `test-results/screens/${size.name}-kaalghar.png` });
  });
}
