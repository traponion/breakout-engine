# Contributing

Thanks for your interest in `breakout-engine`. This document describes the
workflow, branch policy, and commit conventions for the repository.

## Getting Started

```sh
git clone https://github.com/traponion/breakout-engine.git
cd breakout-engine
npm ci
npm run dev
```

Run the full check suite before opening a PR:

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
```

CI runs the same steps. All must pass before a PR can merge.

### Running the Playwright smoke test locally

The smoke test drives a real browser and isn't part of `npm run test`
(that's Vitest's unit-test suite). One-time setup, then run it directly:

```sh
npx playwright install --with-deps chromium
npm run test:e2e
```

## Issues drive changes

This repo uses a lightweight, **issue-driven** GitHub flow — plain GitHub Flow
with one rule added: every non-trivial change starts as an issue.

1. **Open an issue first**, using the _Feature / change_ form. It requires three
   fields: a **Goal**, the **Why** (motivation and any decisions behind it), and
   verifiable **Acceptance criteria** (a checklist). This issue is the contract.
2. **One issue → one branch** (see [Branching](#branching)).
3. **One branch → one PR**, whose description links the issue with `Closes #<n>`.
4. CI must be green and `main` is protected; merging closes the issue.

Why an issue, and why the _Why_ field is mandatory: this repo is public and
developed with AI assistance. An issue is the durable, shared record of _why_ a
change exists — it outlives an agent's per-session memory and is legible to
anyone reading the repo, in a way a local note is not. Rationale that turns out
to be lasting (architectural decisions) should graduate from the issue into
`DESIGN.md` so the context an agent reads every session carries the _why_.

Trivial, self-evident changes (typos, formatting, a one-line comment) may skip
the issue. When in doubt, open one.

## Branching

`main` is protected. All changes go through a pull request from a feature
branch. Name branches by type:

| Prefix      | Use for                             |
| ----------- | ----------------------------------- |
| `feat/`     | a new feature                       |
| `fix/`      | a bug fix                           |
| `docs/`     | documentation only                  |
| `refactor/` | code change without behavior change |
| `test/`     | adding or fixing tests              |
| `chore/`    | tooling, deps, config               |
| `ci/`       | CI/CD changes                       |

Example: `feat/ball-physics`, `fix/paddle-clamp`.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/). The
subject line uses one of the type prefixes above, written in English:

```
feat: add ball-paddle collision response
```

- **Subject in English.** Imperative mood, no trailing period.
- **Scopes are optional** in early development; once the layered modules exist,
  prefer scoped types such as `feat(core):` or `fix(render):`.
- **Body is required only for non-trivial changes** — explain the "why", not
  the "what". Small changes (typos, formatting) need only a subject.
- **AI-assisted commits** must include a `Co-Authored-By:` trailer naming the
  model used. See `CLAUDE.md` for details.

## Pull Requests

- Keep PRs focused on a single concern.
- Fill in the PR template.
- PRs are merged via **squash merge** to keep `main` history linear and
  readable.
- A green CI run is required to merge.

### Asset changes are out of scope

This repository ships **sample** assets under `assets/` (see
`assets/LICENSE.txt`). PRs that replace or restyle the sample mascot or reward
images will not be merged — customization is meant to happen in your own fork.
Bug fixes and engine improvements are always welcome.

## Maintainer: Branch Protection Setup

For reference, `main` protection is configured in the repository settings
(**Settings → Branches → Add branch ruleset**, or via the API) with:

- Require a pull request before merging.
- Require status checks to pass before merging — select the CI workflow's
  `ci` job.
- Require branches to be up to date before merging.
- Block force pushes and deletions on `main`.

Equivalent via `gh`:

```sh
gh api -X PUT repos/traponion/breakout-engine/branches/main/protection \
  --input protection.json
```

where `protection.json` requires the `ci` status check and at least one
pull-request review.
