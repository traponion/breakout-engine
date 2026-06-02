# breakout-engine

A small, dependency-light HTML5 Canvas breakout game engine with customizable assets.

[![CI](https://github.com/traponion/breakout-engine/actions/workflows/ci.yml/badge.svg)](https://github.com/traponion/breakout-engine/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> Phase 1 scaffolding. The engine itself is being implemented in a later phase.

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
  difficulty: 'NORMAL', // 'EASY' | 'NORMAL' | 'HARD'
  bgmVolume: 80,
  seVolume: 90,
  lang: 'en',
  showMascotComments: true,
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    { minScore: 3001, src: 'assets/rewards/reward-002.webp' },
    { minScore: 6001, src: 'assets/rewards/reward-003.webp' },
    { minScore: 9001, src: 'assets/rewards/reward-004.webp' },
  ],
};
```

## Develop

See `CLAUDE.md` for coding standards and development commands. `DESIGN.md` covers the architecture, extension points, and asset conventions. `CONTRIBUTING.md` covers branch policy and PR workflow.

## License

- **Source code: MIT.** See `LICENSE`.
- **Bundled sample assets: separate terms.** See `assets/LICENSE.txt`. In short: edit and replace them freely in your own forks; do not redistribute the sample files as standalone assets, and do not ship them unchanged as the default mascot of a derivative product.

Please bring your own mascot. That's the fun part.
