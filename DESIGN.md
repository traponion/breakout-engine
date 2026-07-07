# DESIGN.md

Design principles and architecture for `breakout-engine`. This is the forward-looking contract that future implementation work must follow.

## Principles

1. **Server-zero.** The engine runs without any backend. No network access beyond the site's own static assets: no external APIs, CDNs, or telemetry. Fully functional offline from a `file://` URL. All required assets are bundled or shipped alongside the build.
2. **Customizable in place.** Difficulty, audio, language, mascot, and reward visuals can be changed by users without recompiling the source.
3. **Light by default.** The build target stays small (see [Performance Budget](#performance-budget)). New runtime dependencies require justification.
4. **Readable single-purpose code.** Vertical-slice organization, no framework layer, no `any`, no `eslint-disable`.

## Layered Architecture

```
src/
├── main.ts     # bootstrap: load config → start engine
├── core/       # game state, physics, collisions, scoring
├── render/     # canvas drawing, animations, effects
├── audio/      # SE playback: Web Audio buffers (http) / element pools (file)
├── config/     # config loading, schema validation, defaults
└── i18n/       # text and dialogue catalogs
```

Each layer has a single responsibility and exposes a small API to the layers above it. `main.ts` wires the layers together; nothing else depends on `main.ts`.

## State Ownership

Layered Architecture names module responsibility; this section names the orthogonal axis — how a given piece of state is expected to behave, and where that decides it should live. Three shapes recur:

1. **Per-frame simulation state stays mutable, in the imperative shell.** Ball/paddle position, bricks, bullets, particles, score, combo — anything touched every tick — lives as plain mutable objects/arrays owned by `core/game.ts`. It is not restructured into immutable per-frame snapshots; the frame budget (16 ms, see [Performance Budget](#performance-budget)) doesn't leave room for that allocation churn. This is the "imperative shell."
2. **Pure input→output calculations are extracted as standalone functions.** Collision resolution, damage/score math, and coordinate transforms don't need the shell's mutable state to run — they take values in, return a value out. Pulling them out as module-scope `export function`s makes them unit-testable without a canvas or audio context, and documents intent with a name instead of an inline expression. `checkBallWallCollision` / `resolveBrickCollision` and the later `computeScore` / `pitchForHp` / `pitchForCombo` / `computePowerShotCurve` are the worked examples — new arithmetic that doesn't need shell state should follow the same pattern rather than staying inline in a method.
3. **Low-frequency, event-driven settings own themselves end-to-end, and callers pull.** Mute, SE volume, and similar settings aren't touched every frame; they change on a user action and get read back occasionally. `BreakoutAudioManager` (`src/audio/`) owns this shape already: `localStorage` persistence and the mutation methods (`setMuted`, `setSEVolume`, `toggleMute`) live inside the class, and `core/game.ts` only calls the getters (`isMuted()`, `getSEVolume()`) once per frame to read the current value into the render context. New settings (a future difficulty or language preference that needs persistence) should follow this pull-based, self-owned-module shape rather than being threaded through `Game` as loose fields.

What this repo deliberately does **not** reach for: a reactive push-based store (subscribe/notify, à la nanostores). That shape earns its cost only once a piece of state has multiple independent subscribers that need to react to the same change; today every consumer of settings state is a single per-frame pull site. Introduce a subscribe-based store when a second, genuinely independent subscriber shows up — not ahead of that need, and not as a general replacement for shape 1 or 2 above.

## Runtime Configuration

Users tune the game by editing `config.js`, which is loaded via a `<script>` tag in `index.html` before the bundle. The file is plain JavaScript (not a build artifact) so that editing it does not require Node or a rebuild.

```js
// config.js — shipped alongside the build
window.BREAKOUT_CONFIG = {
  difficulty: 'easy', //    'easy' | 'hard'
  seVolume: 90, //          0–100
  lang: 'ja', //            'ja' | 'en' (extendable via src/i18n/)
  showMascotComments: true,
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    // ...
  ],
  // sounds: { paddleHit: '...' } — per-SE path overrides (see Asset Conventions)
};
```

At boot, the `config/` layer reads `window.BREAKOUT_CONFIG`, validates the shape, fills in defaults for missing fields, and rejects invalid values with a console warning. No silent fallback for typed fields.

## Asset Conventions

Bundled sample assets live under `assets/`. The engine resolves paths by **convention**, not by hard-coded paths in source. A user can replace a file in `assets/` and the engine picks up the change without code modification.

### Mascot

```
assets/mascot/face-${state}.webp
```

Where `${state}` is one of: `normal`, `sad`, `cry`, `surprised`, `shy`, `sparkle` (the list is `MASCOT_FACE_STATES` in `src/core/game.ts`). The engine constructs the path from the state name at render time. Users wanting to swap the mascot replace the files in place.

### Rewards

```
assets/rewards/reward-${NNN}.webp
```

Where `${NNN}` is a zero-padded sequence number. Reward unlock thresholds are defined in `config.js`, so users can change both the images and the thresholds without touching source code.

### Sounds

```
assets/sounds/se-${name}.mp3
```

Sound effects are pre-rendered audio files. Replace a file in place (same name), or point a `config.js` `sounds.<name>` entry at a different path; neither requires a rebuild. The SE names are the keys of `SE_NAMES` in `src/audio/` (e.g. `paddleHit`, `blockBreak`, `gameOver`). Bundled samples are generic 8-bit chiptune renders.

Playback picks one of two backends at boot, by URL scheme — the same default-plus-fallback split that established game-audio libraries use:

- **http(s)** (dev server, Pages): same-origin `fetch` + `decodeAudioData` into Web Audio buffers, one `AudioBufferSourceNode` per play through a gain node. Low latency, free polyphony, cheap `playbackRate` pitch variation; the volume slider works everywhere, including iOS.
- **`file://`** (the primary replace-in-place persona): `fetch` of local files is blocked, so SE play through small pools of `HTMLAudioElement` instances (rotated per play so rapid repeats overlap). Media elements load relative paths the way `<img>` does, keeping the engine fully functional offline. Known limit on this path: iOS Safari treats the element `volume` property as user-controlled — irrelevant in practice, since iOS reaches the demo over http(s).

Audio unlocks on the first completed user gesture — `click`/`touchend`/`mouseup`, since WebKit does not count `touchstart` as activation — and unlock attempts are retried on later gestures. No sound is attempted before the unlock.

### Constraints

- **WebP only** for images.
- **75 KB per image** as a soft cap.
- **No EXIF metadata** in committed images.

These are review-time checks today — nothing in CI or the build step enforces
them yet. Verify manually before committing image assets; automating the
checks is a candidate follow-up.

## Server-Zero Principle

The engine must run from a `file://` URL with no network access. To enforce this:

- No network access beyond the site's own static assets. Same-origin loading of bundled/replaced assets over http(s) — including `fetch` for audio decoding — is part of serving a static site, not a server dependency. Calls to external origins (APIs, CDNs, telemetry, remote logging) are forbidden.
- Under `file://`, where `fetch` of local files is blocked, every feature must keep working through media-element/DOM loading paths; full offline function is the acceptance bar.
- No external CDN scripts; everything is bundled or shipped alongside.
- Persistence is limited to `localStorage` for non-PII state (settings, best-scores cache). Anything that would require a server is out of scope.

## Performance Budget

- **Gzipped bundle size:** under 100 KB.
- **Time to first interactive:** under 1 second on broadband.
- **Frame budget:** under 16 ms per frame on a modern laptop CPU at 60 fps.

Budgets are verified manually at review time — e.g. `gzip -c dist/bundle.js | wc -c` for size, browser profiling for timing; nothing in CI enforces them yet. New dependencies that materially increase any of these numbers require justification in the PR description.

## Testing & Coverage

Tests live next to source files as `*.test.ts`. Vitest auto-discovers, and CI runs `npm run test:coverage` (V8 provider) with a global floor enforced via `vitest.config.ts`.

Initial floors (set just below the current baseline so any regression fails the build, while leaving room for the gradual ratchet up):

| Metric     | Floor | Current |
| ---------- | ----- | ------- |
| Lines      | 25%   | ~28%    |
| Statements | 25%   | ~29%    |
| Branches   | 22%   | ~24%    |
| Functions  | 35%   | ~39%    |

Pure data and type-only files (`src/i18n/**`, `src/**/types.ts`, `src/core/entities.ts`) are excluded from coverage — measuring them inflates the number without adding signal.

Ratchet rule: when a PR raises coverage, raise the matching floor in the same PR. Lowering a floor requires a one-line justification in the PR description (e.g. removed a tested module). The intent is to make the floor follow real coverage upward over time, not to lock in today's gaps.

## Extension Points (Summary)

| What                        | Where                               | How                                              |
| --------------------------- | ----------------------------------- | ------------------------------------------------ |
| Difficulty, audio, language | `config.js`                         | Edit the file, reload the page.                  |
| Mascot face                 | `assets/mascot/face-${state}.webp`  | Replace files following the convention.          |
| Reward images               | `assets/rewards/reward-${NNN}.webp` | Replace files; update thresholds in `config.js`. |
| Sound effects               | `assets/sounds/se-${name}.mp3`      | Replace files; or override paths in `config.js`. |
| New language                | `src/i18n/`                         | Add a new catalog matching the `en` shape.       |
| New visual effect           | `src/render/`                       | Add a renderer module and wire it in.            |
