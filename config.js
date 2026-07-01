// Runtime configuration for breakout-engine.
//
// Edit this file and reload the page — no build step or Node required. The engine
// reads `window.BREAKOUT_CONFIG` at boot, validates it, and fills in defaults for
// anything missing or invalid (see DESIGN.md).
window.BREAKOUT_CONFIG = {
  difficulty: 'easy', //          'easy' | 'hard'
  seVolume: 90, //                0–100 initial SE volume (the in-game slider overrides
  //                              this and persists per browser)
  lang: 'ja', //                  'ja' | 'en'
  showMascotComments: true,
  // Score thresholds → reward art shown on game over. Highest matched threshold wins.
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    { minScore: 3001, src: 'assets/rewards/reward-002.webp' },
    { minScore: 6001, src: 'assets/rewards/reward-003.webp' },
    { minScore: 9001, src: 'assets/rewards/reward-004.webp' },
  ],
  // Per-SE sound overrides. Default: assets/sounds/se-<name>.mp3 — replace those
  // files in place, or point individual entries elsewhere (names in DESIGN.md):
  // sounds: { paddleHit: 'assets/sounds/my-paddle-hit.mp3' },
};
