import { describe, expect, it } from 'vitest';
import { render } from './renderer';
import type { RenderContext } from './renderer';

// Recording 2d-context fake: every method becomes a no-op that counts its
// calls, so tests can assert what render() did without a DOM.
function fakeCtx(calls: Record<string, number>): CanvasRenderingContext2D {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'measureText') return () => ({ width: 0 });
        if (prop === 'createLinearGradient') return () => ({ addColorStop: (): void => undefined });
        return (): void => {
          const key = String(prop);
          calls[key] = (calls[key] ?? 0) + 1;
        };
      },
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

function baseContext(ctx: CanvasRenderingContext2D, showMascotComments: boolean): RenderContext {
  return {
    ctx,
    canvasWidth: 320,
    canvasHeight: 480,
    frameCount: 0,
    gameState: 'playing',
    score: 0,
    lives: 50,
    displayLives: 50,
    maxLives: 50,
    difficulty: 1,
    ball: {
      x: 160,
      y: 240,
      dx: 0,
      dy: 0,
      radius: 8,
      isPowerShot: false,
      powerShotBricksDestroyed: 0,
    },
    paddle: { x: 130, y: 460, width: 60, height: 10 },
    bricks: [],
    bullets: [],
    homingBullets: [],
    lasers: [],
    homingLasers: [],
    particles: [],
    deathParticles: [],
    invincibleTimer: 0,
    warning: '',
    screenShake: 0,
    mascot: { comment: '', displayText: '', charIndex: 0, timer: 0, icon: null, iconLoaded: false },
    showMascotComments,
    lang: 'en',
    iconsLoaded: true,
    iconsLoadedCount: 6,
    totalIconCount: 6,
    rewardImagesLoaded: true,
    rewardImage: null,
    dangerLevel: 0,
    muted: false,
    seVolume: 90,
    trackTitleText: null,
    trackTitleTimer: 0,
    levelUpText: null,
    levelUpTimer: 0,
    comboPopups: [],
  };
}

// The speech bubble chrome is the only roundRect user in the renderer, so
// its call count tells whether the bubble was drawn.
describe('render — mascot comment gating', () => {
  it('draws no bubble chrome when mascot comments are disabled', () => {
    const calls: Record<string, number> = {};
    render(baseContext(fakeCtx(calls), false));
    expect(calls.roundRect).toBeUndefined();
  });

  it('draws the bubble chrome when mascot comments are enabled', () => {
    const calls: Record<string, number> = {};
    render(baseContext(fakeCtx(calls), true));
    expect(calls.roundRect).toBeGreaterThanOrEqual(2);
  });
});
