# CLAUDE.md

Instructions for AI assistants contributing to `breakout-engine`.

## Project Overview

`breakout-engine` is a small, dependency-light HTML5 Canvas breakout game engine that ships as a standalone, server-free static site. Customization happens through a runtime `config.js` and assets the user replaces in `assets/`. No backend, no telemetry, no network calls.

## Tech Stack

- **TypeScript** (strict, ESM, bundler module resolution)
- **esbuild** for bundling and the dev server
- **vitest** for tests
- **ESLint v10** (flat config) with Prettier and `eslint-config-prettier`
- **husky** + **lint-staged** for pre-commit checks
- **GitHub Actions** for CI and Pages deploy

## Coding Standards

- `any` is forbidden. Use precise types or `unknown` with narrowing.
- `eslint-disable` annotations are forbidden. Fix the root cause, not the symptom.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `style:`).
- Keep engine code character-neutral and data-driven. Default content (mascot comments, face images, reward art) ships as replaceable data under `src/i18n/`, `config.js`, and `assets/` — not hard-coded into `core`/`render`/`config` logic.
- No runtime server dependencies: no `fetch`, no external APIs, no telemetry. Persistence beyond `localStorage` requires a design discussion.
- Prefer reuse and small composable functions over duplication. Justify abstractions only when the third call site appears.

## AI-Assisted Contributions

Commits authored with AI assistance must add a `Co-Authored-By:` trailer
identifying the model used, for transparency:

    Co-Authored-By: <model name and version> <noreply@anthropic.com>

Fill in the model name and version current at authorship time. Do not
hard-code a specific version anywhere else in the repository — it goes
stale.

## Development Commands

| Task       | Command             |
| ---------- | ------------------- |
| Install    | `npm ci`            |
| Dev server | `npm run dev`       |
| Build      | `npm run build`     |
| Type check | `npm run typecheck` |
| Lint       | `npm run lint`      |
| Format     | `npm run format`    |
| Test       | `npm run test`      |

CI runs `typecheck`, `lint`, `format:check`, `test`, and `build`. All must be green before a PR can merge.

## Testing

Tests live next to source files as `*.test.ts`. Vitest auto-discovers. Prefer small, deterministic units; avoid global state and module-level side effects.

## Branch & PR Policy

See `CONTRIBUTING.md` for branch naming, PR template usage, and main-branch protection setup. The repository policy is PR-only — direct pushes to `main` are blocked.

Changes are **issue-driven**: open an issue (Goal / Why / Acceptance Criteria) before branching, and close it from the PR with `Closes #<n>`. The mechanics live in `CONTRIBUTING.md`. The reason it is mandatory — including the _Why_ field — is that this repo is public and AI-assisted: the issue is the durable, shared record of _why_ a change exists, surviving an agent's per-session memory loss in a way a commit or local note does not. Lasting architectural rationale graduates from the issue into `DESIGN.md`.

## Architecture

See `DESIGN.md` for the layered structure (`core` / `render` / `audio` / `config` / `i18n`), runtime extension points, the server-zero principle, and asset naming conventions.

## Asset Conventions

Sample assets in `assets/` are bundled for the default experience. Users replace them at runtime by editing files in place. See `DESIGN.md` for the naming convention and `assets/LICENSE.txt` for the usage terms attached to bundled sample assets.
