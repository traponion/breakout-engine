# breakout-engine

A small, dependency-light HTML5 Canvas breakout game engine with customizable assets.

[![CI](https://github.com/traponion/breakout-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/traponion/breakout-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

English | [日本語](./README.ja.md)

> Playable now: the core game and sound effects have shipped.

| Ready                                          | Playing                                       | Game over                                             |
| ---------------------------------------------- | --------------------------------------------- | ----------------------------------------------------- |
| ![Ready screen](./docs/screenshots/ready.webp) | ![Gameplay](./docs/screenshots/gameplay.webp) | ![Game over screen](./docs/screenshots/gameover.webp) |

## Goals

- **Zero server dependencies.** Runs entirely client-side; just open `index.html`.
- **Customizable in place.** Edit `config.js` (no rebuild required) and replace files under `assets/` to change difficulty, audio, language, mascot, and reward visuals.
- **Light and readable.** TypeScript source, minimal devDependencies, no framework.

## Try it

A live demo is published to GitHub Pages once `main` builds successfully:

<https://traponion.github.io/breakout-engine/>

## Use it locally

```sh
npm ci
npm run dev
```

Visit `http://localhost:8000` in a browser. Edit `config.js` and reload to see changes.

## Customize

The engine reads `config.js` at runtime. Default values are bundled, but every value can be overridden by editing the file shipped alongside the build.

Bundled sample assets live under `assets/`. Replace files in place to use your own mascot, reward illustrations, and sound effects. See `DESIGN.md` for the asset naming convention.

```js
// config.js
window.BREAKOUT_CONFIG = {
  difficulty: 'easy', // 'easy' | 'hard'
  seVolume: 90, // 0–100 initial SE volume (the in-game slider overrides this)
  lang: 'ja', // 'ja' | 'en'
  showMascotComments: true,
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    { minScore: 3001, src: 'assets/rewards/reward-002.webp' },
    { minScore: 6001, src: 'assets/rewards/reward-003.webp' },
    { minScore: 9001, src: 'assets/rewards/reward-004.webp' },
  ],
  // Per-SE sound overrides. Defaults follow assets/sounds/se-<name>.mp3:
  // sounds: { paddleHit: 'assets/sounds/my-paddle-hit.mp3' },
};
```

## Develop

See `CLAUDE.md` for coding standards and development commands. `DESIGN.md` covers the architecture, extension points, and asset conventions. `CONTRIBUTING.md` covers branch policy and PR workflow.

## License

- **Source code: MIT.** See `LICENSE`.
- **Bundled sample content: separate terms.** See `assets/LICENSE.txt`. This covers the files under `assets/` and the sample dialogue catalog in `src/i18n/comments.ts`. In short: edit and replace them freely in your own forks; do not redistribute the samples as standalone assets, and do not ship them unchanged as the default mascot of a derivative product.

Please bring your own mascot. That's the fun part.
