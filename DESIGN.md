# DESIGN.md

Design principles and architecture for `breakout-engine`. This is the forward-looking contract that future implementation work must follow.

## Principles

1. **Server-zero.** The engine runs without any backend. No `fetch`, no telemetry, no external CDN dependencies. All required assets are bundled or shipped alongside the build.
2. **Customizable in place.** Difficulty, audio, language, mascot, and reward visuals can be changed by users without recompiling the source.
3. **Light by default.** The build target stays small (see [Performance Budget](#performance-budget)). New runtime dependencies require justification.
4. **Readable single-purpose code.** Vertical-slice organization, no framework layer, no `any`, no `eslint-disable`.

## Layered Architecture

```
src/
├── main.ts     # bootstrap: load config → start engine
├── core/       # game state, physics, collisions, scoring
├── render/     # canvas drawing, animations, effects
├── audio/      # sound effects, MML or Web Audio playback
├── config/     # config loading, schema validation, defaults
└── i18n/       # text and dialogue catalogs
```

Each layer has a single responsibility and exposes a small API to the layers above it. `main.ts` wires the layers together; nothing else depends on `main.ts`.

## Runtime Configuration

Users tune the game by editing `config.js`, which is loaded via a `<script>` tag in `index.html` before the bundle. The file is plain JavaScript (not a build artifact) so that editing it does not require Node or a rebuild.

```js
// config.js — shipped alongside the build
window.BREAKOUT_CONFIG = {
  difficulty: 'NORMAL', // 'EASY' | 'NORMAL' | 'HARD'
  bgmVolume: 80, //         0–100
  seVolume: 90, //          0–100
  lang: 'en', //            'en' | (extendable)
  showMascotComments: true,
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    // ...
  ],
};
```

At boot, the `config/` layer reads `window.BREAKOUT_CONFIG`, validates the shape, fills in defaults for missing fields, and rejects invalid values with a console warning. No silent fallback for typed fields.

## Asset Conventions

Bundled sample assets live under `assets/`. The engine resolves paths by **convention**, not by hard-coded paths in source. A user can replace a file in `assets/` and the engine picks up the change without code modification.

### Mascot

```
assets/mascot/face-${state}.webp
```

Where `${state}` is one of: `normal`, `happy`, `sad`, `cry`, `surprised`, `shy`, `sparkle`. The engine constructs the path from the state name at render time. Users wanting to swap the mascot replace the files in place.

### Rewards

```
assets/rewards/reward-${NNN}.webp
```

Where `${NNN}` is a zero-padded sequence number. Reward unlock thresholds are defined in `config.js`, so users can change both the images and the thresholds without touching source code.

### Sounds

Sound effects are synthesized at runtime via the Web Audio API rather than loaded as audio files, to keep the bundle small. Background music uses MML or a similar text-based format that compiles in the build step.

### Constraints

- **WebP only** for images. Any other format is rejected by lint or build.
- **75 KB per image** as a soft cap. Larger images fail CI.
- **EXIF metadata stripped** by the build step.

## Server-Zero Principle

The engine must run from a `file://` URL with no network access. To enforce this:

- No `fetch`, `XMLHttpRequest`, or `WebSocket` calls in runtime code.
- No external CDN scripts; everything is bundled or shipped alongside.
- No telemetry, analytics, or remote logging.
- Persistence is limited to `localStorage` for non-PII state (settings, best-scores cache). Anything that would require a server is out of scope.

## Performance Budget

- **Gzipped bundle size:** under 100 KB.
- **Time to first interactive:** under 1 second on broadband.
- **Frame budget:** under 16 ms per frame on a modern laptop CPU at 60 fps.

Regressions against these budgets are caught by the build step (size) or by manual profiling (timing). New dependencies that materially increase any of these numbers require justification in the PR description.

## Extension Points (Summary)

| What                        | Where                               | How                                              |
| --------------------------- | ----------------------------------- | ------------------------------------------------ |
| Difficulty, audio, language | `config.js`                         | Edit the file, reload the page.                  |
| Mascot face                 | `assets/mascot/face-${state}.webp`  | Replace files following the convention.          |
| Reward images               | `assets/rewards/reward-${NNN}.webp` | Replace files; update thresholds in `config.js`. |
| New language                | `src/i18n/`                         | Add a new catalog matching the `en` shape.       |
| New visual effect           | `src/render/`                       | Add a renderer module and wire it in.            |
