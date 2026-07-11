# Playwright Smoke Test — Design

Closes #20.

## Goal

Add a minimal Playwright smoke test that boots the app, loads the page,
exercises the start flow, and fails on console errors, uncaught exceptions,
or a broken canvas render. Run it as a required CI job on every PR.

## Why

`src/render/renderer.ts` is 1193 lines of canvas drawing logic, but every
existing CI check (typecheck, lint, format, unit tests) operates on strings.
The canvas could render a blank screen or throw at startup and CI would
still be green. Scope is intentionally limited to "the app boots and the
start flow does not throw" — visual regression and gameplay simulation are
out of scope.

## Decisions

- **Dev server**: reuse `npm run dev` (esbuild `--servedir=. --watch=forever`)
  as Playwright's `webServer`. It already serves `index.html`, `config.js`,
  and `dist/bundle.js` from the repo root on `http://localhost:8000`
  (documented in `README.md`) with no new static-file-server dependency.
- **Canvas render assertion**: sample a single canvas pixel via
  `ctx.getImageData` rather than full-page screenshot diffing (out of
  scope per the issue) or a new test-only `window` hook (production code
  change not justified for a black-box smoke test). The center of
  `UI.ready.easyBtn` (`src/core/game.ts`) is a solid fill (`#22c55e`,
  `rgb(34,197,94)`), robust to anti-aliasing unlike sampling title text.
- **Start flow**: the app has no DOM start button — `handleReadyClick` in
  `src/core/game.ts` starts the game on a canvas click inside
  `UI.ready.easyBtn` (`{x:60,y:350,w:80,h:32}`, center `(100,366)`,
  canvas is 320×480 and CSS-capped to that size via `style.css`
  `width: min(100%, 320px)`, so Playwright's default 1280px-wide viewport
  doesn't rescale it). Clicking that point and re-sampling the same pixel
  (expecting it to no longer be the button green) proves the ready→playing
  transition happened, without needing to read internal game state.
- **Vitest/Playwright coexistence**: `vitest.config.ts` does not currently
  override `test.include`, so Vitest's default pattern
  (`**/*.{test,spec}.*`) would also try to run Playwright's `.spec.ts`
  files under `npm run test` and fail (wrong test runner globals, no
  `webServer`). Fix: add `test.exclude: [...configDefaults.exclude, 'e2e/**']`.
- **CI job placement**: new `e2e` job in `.github/workflows/ci.yml`,
  parallel to the existing `ci` job (not chained via `needs`), so both
  give feedback at the same time.
- **Branch protection**: making the `e2e` job a required status check is a
  GitHub repository settings change (`gh api .../branches/main/protection`),
  done as a **separate step after this PR merges and the job has run green
  at least once** — not part of this PR. Requiring an unverified check name
  risks blocking all future PRs if the job is flaky or misnamed.

## Components

### `playwright.config.ts` (new, repo root)

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:8000',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

Chromium-only: matches the issue's "minimal smoke test" scope. Firefox/WebKit
projects can be added later if cross-browser regressions become a real
concern — not by default.

### `e2e/smoke.spec.ts` (new)

One test, covering the full acceptance criteria in one flow:

```ts
import { test, expect, type Page } from '@playwright/test';

const START_BUTTON = { x: 100, y: 366 }; // UI.ready.easyBtn center
const READY_BUTTON_GREEN = [34, 197, 94]; // #22c55e

async function samplePixel(page: Page, x: number, y: number): Promise<number[]> {
  return page.evaluate(
    ([px, py]) => {
      const canvas = document.querySelector('[data-breakout-canvas]') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
      return Array.from(ctx.getImageData(px, py, 1, 1).data);
    },
    [x, y],
  );
}

function isCloseTo(pixel: number[], target: number[], tolerance = 12): boolean {
  return target.every((v, i) => Math.abs(pixel[i] - v) <= tolerance);
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
```

### `vitest.config.ts` (edit)

Add `test.exclude` so Vitest ignores the `e2e/` directory:

```ts
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {/* unchanged */},
  },
});
```

### `package.json` (edit)

- Add devDependency `@playwright/test`.
- Add script `"test:e2e": "playwright test"`.

### `.gitignore` (edit)

Add `playwright-report/` and `test-results/` (Playwright's default HTML
report and trace/screenshot output directories).

### `tsconfig.json` (edit)

`include` is currently `["src/**/*", "tests/**/*"]` — `e2e/**/*` isn't
covered, so `npm run typecheck` would silently skip the new spec file.
Add `"e2e/**/*"` to `include` so the new test is held to the same strict
TypeScript bar (`any` forbidden) as the rest of the repo. (`playwright.config.ts`
at the repo root stays outside `include`, matching the existing precedent of
`vitest.config.ts` and `eslint.config.js` — root-level tool configs aren't
part of the `typecheck` script today.) ESLint's flat config has no `files:`
restriction beyond its top-level `ignores`, so `eslint .` already covers
`e2e/**` and `playwright.config.ts` without changes.

### `.github/workflows/ci.yml` (edit)

New job, parallel to `ci`:

```yaml
e2e:
  name: e2e smoke test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version-file: .nvmrc
        cache: npm
    - run: npm i -g npm@latest
    - run: npm ci
    - run: npx playwright install --with-deps chromium
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: ${{ !cancelled() }}
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 7
```

### `CONTRIBUTING.md` (edit)

Add a short subsection documenting local usage:
`npx playwright install --with-deps chromium` (one-time), then
`npm run test:e2e`.

## Error Handling

- Console errors and uncaught page exceptions both fail the test (collected
  into `errors`, asserted empty at the end) — this is the primary signal
  the issue asks for.
- `expect.poll` (default 5s timeout) replaces a fixed `waitForTimeout`,
  so the test isn't tuned to CI machine speed.
- Playwright's own `webServer.timeout` (120s) covers the case where
  `npm run dev`'s initial esbuild build is slow to come up.

## Testing

This change adds the only browser-driven test in the repo; there is no
"test the test" step beyond running it locally and in CI and confirming it
fails when it should (e.g. temporarily breaking `drawReadyScreen` should
fail the pixel assertion — verified during implementation, not shipped).

## Out of Scope

- Visual regression / screenshot diffing.
- Gameplay simulation (ball physics, scoring, combos).
- Firefox/WebKit projects.
- Updating GitHub branch protection (follow-up after merge, see Decisions).
