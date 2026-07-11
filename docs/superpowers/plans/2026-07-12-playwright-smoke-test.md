# Playwright Smoke Test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal Playwright smoke test (boot → ready screen renders → click start → no console errors) that runs locally and as a required CI job on every PR, closing issue #20.

**Architecture:** `@playwright/test` drives a real Chromium browser against the existing `npm run dev` esbuild server (no new static-file-server dependency). The single spec asserts canvas state via `ctx.getImageData` pixel sampling instead of screenshot diffing or new test-only hooks, keeping the production bundle untouched. A new `e2e` GitHub Actions job runs it in parallel with the existing `ci` job; making it a required merge check is a follow-up done after this PR merges and the job is verified green on `main`.

**Tech Stack:** TypeScript (strict), `@playwright/test` (Chromium project only), esbuild dev server, Vitest (existing unit tests, now scoped away from `e2e/`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-12-playwright-smoke-test-design.md` (commit `f1b55ee`, approved by the repo owner).

## Global Constraints

- `any` is forbidden — use precise types or `unknown` with narrowing (project `CLAUDE.md`).
- `eslint-disable` annotations are forbidden — fix root causes (project `CLAUDE.md`).
- Commits follow Conventional Commits (`test:`, `ci:`, `docs:`, etc.), subject in English, imperative mood.
- Every commit in this plan is AI-assisted: include a trailer
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- No runtime server dependencies: no telemetry, no network calls beyond same-origin static assets (Server-Zero principle, `DESIGN.md`).
- Chromium-only for this feature — do not add Firefox/WebKit projects (approved spec decision).
- Branch: `test/issue-20-playwright-smoke-test` (already created from `origin/main`). PR must say `Closes #20`.
- CI must stay green on all existing checks (`typecheck`, `lint`, `format:check`, `test:coverage`, `build`) plus the new `e2e` job.
- GitHub branch protection changes are **out of scope for this PR** — that's Task 3, executed only after Task 2's PR merges and the `e2e` job has run green on `main` at least once.

---

### Task 1: Playwright scaffolding and a working local smoke test

**Files:**

- Modify: `package.json` (add `@playwright/test` devDependency via `npm install`, add `test:e2e` script)
- Create: `playwright.config.ts`
- Modify: `tsconfig.json:19` (add `"e2e/**/*"` to `include`)
- Modify: `vitest.config.ts` (add `test.exclude`)
- Create: `e2e/smoke.spec.ts`
- Modify: `.gitignore` (add `playwright-report/`, `test-results/`)
- Modify: `CONTRIBUTING.md:25` (document running the smoke test locally)

**Interfaces:**

- Consumes: `[data-breakout-canvas]` (existing DOM anchor, `index.html:12`), `UI.ready.easyBtn = {x:60,y:350,w:80,h:32}` (existing, `src/core/game.ts:166`), `<h1>Breakout Engine</h1>` (existing, `index.html:9`). Nothing in this task touches `src/`.
- Produces: `playwright.config.ts` default export (consumed only by the Playwright CLI). `npm run test:e2e` script (consumed by Task 2's CI job).

- [ ] **Step 1: Install `@playwright/test`**

Run: `npm install --save-dev @playwright/test`

Expected: `package.json` gains a `"@playwright/test": "^<version>"` line under `devDependencies`, `package-lock.json` updates.

- [ ] **Step 2: Install the Chromium browser binary**

Run: `npx playwright install --with-deps chromium`

Expected: exits 0. Downloads Chromium + Linux system deps for the sandbox.

- [ ] **Step 3: Create `playwright.config.ts`**

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

- [ ] **Step 4: Write `e2e/smoke.spec.ts`**

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

- [ ] **Step 5: Add the `e2e` directory to `tsconfig.json`'s `include` list**

In `tsconfig.json`, change:

```json
  "include": ["src/**/*", "tests/**/*"],
```

to:

```json
  "include": ["src/**/*", "tests/**/*", "e2e/**/*"],
```

- [ ] **Step 6: Verify the new spec typechecks**

Run: `npm run typecheck`

Expected: exits 0, no errors mentioning `e2e/smoke.spec.ts`.

- [ ] **Step 7: Confirm Vitest currently misfires on the new spec file (red)**

Run: `npm run test`

Expected: **FAILS**. Vitest's default `include` pattern picks up `e2e/smoke.spec.ts` and tries to run it with Vitest's runner; `@playwright/test`'s `test()` throws because it isn't running inside the Playwright test runner (something like `Error: Playwright Test did not expect test() to be called here`). This demonstrates the Vitest/Playwright conflict the spec calls out — confirm the failure is specifically about `e2e/smoke.spec.ts`, not an unrelated regression in the existing suite.

- [ ] **Step 8: Fix `vitest.config.ts` to exclude `e2e/`**

Replace the full contents of `vitest.config.ts` with:

```ts
import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/i18n/**', 'src/**/types.ts', 'src/core/entities.ts'],
      thresholds: {
        lines: 25,
        branches: 22,
        statements: 25,
        functions: 35,
      },
    },
  },
});
```

- [ ] **Step 9: Confirm Vitest is fixed (green)**

Run: `npm run test`

Expected: PASSES, same test count as before this task started (Vitest no longer attempts `e2e/smoke.spec.ts`).

- [ ] **Step 10: Add the `test:e2e` script**

In `package.json`, inside `"scripts"`, add (alphabetical position doesn't matter, keep near the other `test:*` scripts):

```json
    "test:e2e": "playwright test",
```

- [ ] **Step 11: Run the real smoke test against the app**

Run: `npm run test:e2e`

Expected: PASSES — 1 test passed. Playwright starts `npm run dev`, waits for `http://localhost:8000`, runs the spec, tears the server down.

- [ ] **Step 12: Prove the pixel assertion isn't tautological**

Temporarily edit `src/render/renderer.ts` — comment out the two `drawButton(...)` calls inside `drawReadyScreen` (around line 884-885):

```ts
// Difficulty buttons (clicking starts the game)
// drawButton(ctx, easyBtn, labels.easy, '#22c55e', '#fff');
// drawButton(ctx, hardBtn, labels.hard, '#ef4444', '#fff');
```

Run: `npm run test:e2e`

Expected: **FAILS** — the first `expect.poll` (ready-screen green check) times out, because the button is no longer drawn.

Revert the temporary edit (restore both `drawButton` lines exactly as they were), then run `npm run test:e2e` again.

Expected: PASSES again.

- [ ] **Step 13: Add `.gitignore` entries**

Append to `.gitignore` (new section, keep it near the other tool-output entries):

```
# Playwright
playwright-report/
test-results/
```

- [ ] **Step 14: Document local usage in `CONTRIBUTING.md`**

In `CONTRIBUTING.md`, after the existing line (25) `CI runs the same steps. All must pass before a PR can merge.` and before `## Issues drive changes`, insert:

```markdown
### Running the Playwright smoke test locally

The smoke test drives a real browser and isn't part of `npm run test`
(that's Vitest's unit-test suite). One-time setup, then run it directly:

\`\`\`sh
npx playwright install --with-deps chromium
npm run test:e2e
\`\`\`
```

(Use literal triple-backtick fences, not the escaped ones shown above — the escaping here is only to keep this plan's own code block from closing early.)

- [ ] **Step 15: Run the full local check suite**

Run:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

Expected: all five exit 0. If `format:check` fails on `CONTRIBUTING.md`, `.gitignore`, `playwright.config.ts`, `vitest.config.ts`, or `tsconfig.json`, run `npm run format` and re-check the diff is still what you intended.

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json playwright.config.ts tsconfig.json vitest.config.ts e2e/smoke.spec.ts .gitignore CONTRIBUTING.md
git commit -m "$(cat <<'EOF'
test(e2e): add Playwright smoke test for boot and start flow

Boots the app via the existing esbuild dev server, asserts the ready
screen renders (canvas pixel sample) and the difficulty-button click
starts the game, and fails on any console error or uncaught exception.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Wire the smoke test into CI and verify on GitHub

**Files:**

- Modify: `.github/workflows/ci.yml` (add a new `e2e` job)

**Interfaces:**

- Consumes: `npm run test:e2e` (Task 1). `.nvmrc` (existing, pins Node 24 — already used by the `ci` job).
- Produces: a GitHub Actions check named `e2e smoke test`, consumed by Task 3 (branch protection).

- [ ] **Step 1: Add the `e2e` job to `.github/workflows/ci.yml`**

Add this job under `jobs:`, as a sibling of the existing `ci:` job (same indentation level, i.e. two spaces under `jobs:`):

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

The full file should read (unchanged `ci:` job followed by the new `e2e:` job):

```yaml
name: CI

on:
  push:
    branches-ignore:
      - gh-pages
  pull_request:

jobs:
  ci:
    name: typecheck / lint / test / build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      # Upgrade npm to >=11.3.0 for npm/cli#8184 (platform-conditional
      # optional deps were being pruned from package-lock.json on older npm,
      # making `npm ci` reject lockfiles generated by a newer npm).
      - run: npm i -g npm@latest
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm run test:coverage
      - run: npm run build

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

- [ ] **Step 2: Validate the YAML syntax**

Run: `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`

Expected: no output, exit code 0 (PyYAML parses the file without error).

- [ ] **Step 3: Confirm Prettier formatting**

Run: `npm run format:check`

Expected: exits 0. If it fails on `.github/workflows/ci.yml`, run `npm run format` and re-open the file to confirm only whitespace changed.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "$(cat <<'EOF'
ci: run the Playwright smoke test as a parallel e2e job

Runs alongside the existing ci job so both report at the same time.
Not yet a required check — that's a follow-up once this job has run
green on main at least once (see the design doc's Decisions section).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push the branch**

Run: `git push -u origin test/issue-20-playwright-smoke-test`

Expected: branch appears on `origin`.

- [ ] **Step 6: Open the PR**

```bash
gh pr create --title "test(e2e): smoke-test the app via Playwright" --body "$(cat <<'EOF'
## Summary

- Add a minimal Playwright smoke test: boot the app, confirm the ready
  screen renders (canvas pixel sample), click start, assert no console
  errors or uncaught exceptions.
- Add a parallel `e2e` CI job running the test headless on every PR.
- Document how to run the smoke test locally in CONTRIBUTING.md.

Design: `docs/superpowers/specs/2026-07-12-playwright-smoke-test-design.md`
Plan: `docs/superpowers/plans/2026-07-12-playwright-smoke-test.md`

Closes #20.

## Type of change

- [ ] Bug fix
- [x] New feature
- [ ] Refactor (no behavior change)
- [ ] Docs
- [x] Tooling / CI

## Checklist

- [x] `npm run typecheck` passes
- [x] `npm run lint` passes
- [x] `npm run format:check` passes
- [x] `npm run test` passes
- [x] `npm run build` passes
- [x] Commits follow Conventional Commits; AI-assisted commits include a
      `Co-Authored-By:` trailer
- [x] This PR does not replace or restyle bundled sample assets (out of scope —
      see `CONTRIBUTING.md`)

## Notes

Making the new `e2e` job a required merge check is a deliberate follow-up
(separate branch-protection change) after this PR merges and the job has
been observed green on `main` — see the design doc's Decisions section for
why.
EOF
)"
```

- [ ] **Step 7: Watch CI on the PR**

Run: `gh pr checks --watch`

Expected: both `typecheck / lint / test / build` and `e2e smoke test` report success. If `e2e smoke test` fails, download the `playwright-report` artifact (`gh run download <run-id> -n playwright-report`) and inspect it before pushing a fix — do not guess.

---

### Task 3 (post-merge follow-up — do not run as part of this PR)

Run this only after Task 2's PR has merged into `main` **and** the `e2e smoke test` job has completed successfully on `main` at least once.

**Files:**

- No repo files change in this task's core action (a GitHub API call); `CONTRIBUTING.md`'s "Maintainer: Branch Protection Setup" section gets a follow-up doc update.

**Interfaces:**

- Consumes: the `e2e smoke test` check name produced by Task 2, confirmed green on `main`.

- [ ] **Step 1: Read the current branch protection settings**

Run: `gh api repos/traponion/breakout-engine/branches/main/protection > /tmp/current-protection.json`

Inspect the file — do not skip this. The next step must preserve every existing setting (required review count, `ci` in `required_status_checks.contexts`, force-push/deletion blocks) and only add `e2e smoke test` to the contexts list.

- [ ] **Step 2: Write the updated protection payload**

Build `protection.json` from what Step 1 returned, with `required_status_checks.contexts` extended to include both `"ci"` and `"e2e smoke test"` (exact check names as they appear on the PR — confirm by checking the PR's checks list, since the displayed name comes from the workflow job's `name:` field, not the job id).

- [ ] **Step 3: Apply it**

Run: `gh api -X PUT repos/traponion/breakout-engine/branches/main/protection --input protection.json`

Expected: exits 0.

- [ ] **Step 4: Update `CONTRIBUTING.md`'s Maintainer section**

In the "Maintainer: Branch Protection Setup" section, change:

```markdown
- Require status checks to pass before merging — select the CI workflow's
  `ci` job.
```

to:

```markdown
- Require status checks to pass before merging — select the CI workflow's
  `ci` and `e2e smoke test` jobs.
```

Commit this doc update directly on a small follow-up branch/PR (`docs/branch-protection-e2e` or similar) — it's a documentation-only change reflecting a settings change already made, not code, so it still goes through the normal PR flow per `CONTRIBUTING.md`.

## Self-Review

**Spec coverage:**

- Dev server reuse (`npm run dev`) → Task 1 Step 3 (`playwright.config.ts`).
- Canvas pixel-sampling assertion → Task 1 Step 4 (`e2e/smoke.spec.ts`), proven non-tautological in Step 12.
- Start flow via canvas click coordinates → Task 1 Step 4.
- Vitest/Playwright `include` conflict → Task 1 Steps 7-9 (red/green).
- `tsconfig.json` gap → Task 1 Steps 5-6.
- CI job placement (parallel) → Task 2 Step 1.
- Branch protection deferred → Task 3, explicitly separated and gated on a green `main` run.
- `CONTRIBUTING.md` local-usage docs → Task 1 Step 14.
- `.gitignore` additions → Task 1 Step 13.

**Placeholder scan:** no TBD/TODO; every step has literal file content or an exact command with expected output.

**Type consistency:** `samplePixel(page: Page, x: number, y: number): Promise<number[]>` and `isCloseTo(pixel: number[], target: number[], tolerance = 12): boolean` are defined once in Task 1 Step 4 and not redefined elsewhere. `START_BUTTON` / `READY_BUTTON_GREEN` constant names are used consistently within the same file.
