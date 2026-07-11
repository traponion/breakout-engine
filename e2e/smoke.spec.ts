import { test, expect, type Page } from '@playwright/test';

const START_BUTTON = { x: 100, y: 366 }; // UI.ready.easyBtn center
const READY_BUTTON_GREEN: readonly number[] = [34, 197, 94]; // #22c55e

async function samplePixel(page: Page, x: number, y: number): Promise<readonly number[]> {
  return page.evaluate(
    ([px, py]: readonly (number | undefined)[]) => {
      const canvas = document.querySelector('[data-breakout-canvas]') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      if (typeof px !== 'number' || typeof py !== 'number') {
        return [];
      }
      // Account for HiDPI scaling: game renders at up to 3x resolution
      // but logical coordinates are still 320x480
      const scale = canvas.width / 320;
      const scaledX = px * scale;
      const scaledY = py * scale;
      return Array.from(ctx.getImageData(scaledX, scaledY, 1, 1).data);
    },
    [x, y],
  );
}

function isCloseTo(
  pixel: readonly (number | undefined)[],
  target: readonly number[],
  tolerance = 12,
): boolean {
  return target.every((v, i) => {
    const p = pixel[i];
    return p !== undefined && Math.abs(p - v) <= tolerance;
  });
}

test('boots, renders the ready screen, and starts without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Breakout Engine' })).toBeVisible();

  const canvas = page.locator('[data-breakout-canvas]');
  await expect(canvas).toBeVisible();

  await expect
    .poll(async () =>
      isCloseTo(await samplePixel(page, START_BUTTON.x, START_BUTTON.y), READY_BUTTON_GREEN),
    )
    .toBe(true);

  await canvas.click({ position: START_BUTTON });

  await expect
    .poll(async () =>
      isCloseTo(await samplePixel(page, START_BUTTON.x, START_BUTTON.y), READY_BUTTON_GREEN),
    )
    .toBe(false);

  expect(errors).toEqual([]);
});
