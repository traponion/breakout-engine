import { loadConfig } from './config';
import { BreakoutGame, getCurrentGame } from './core/game';

export const ENGINE_NAME = 'breakout-engine';

/** Wire the canvas to a game instance and forward pointer/touch input. */
function bootstrap(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-breakout-canvas]');
  if (!canvas) {
    console.warn('[breakout] canvas [data-breakout-canvas] not found; engine not started');
    return;
  }

  const config = loadConfig();
  if (!getCurrentGame(canvas)) {
    new BreakoutGame(canvas, config.lang, config.difficulty, {
      rewards: config.rewards,
      showMascotComments: config.showMascotComments,
    });
  }

  canvas.addEventListener('mousemove', (event) => {
    getCurrentGame(canvas)?.handleMouseMove(event.clientX, event.clientY);
  });
  canvas.addEventListener('mousedown', () => {
    getCurrentGame(canvas)?.handleSwipeStart();
  });
  canvas.addEventListener('click', (event) => {
    getCurrentGame(canvas)?.handleClick(event.clientX, event.clientY);
  });
  canvas.addEventListener(
    'touchmove',
    (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) getCurrentGame(canvas)?.handleTouchMove(touch.clientX, touch.clientY);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchstart',
    (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      if (touch) getCurrentGame(canvas)?.handleTouchStart(touch.clientX, touch.clientY);
    },
    { passive: false },
  );
  canvas.addEventListener(
    'touchend',
    (event) => {
      event.preventDefault();
      getCurrentGame(canvas)?.handleTouchEnd();
    },
    { passive: false },
  );
}

// Guard against non-DOM environments (e.g. test runner) so importing this module
// has no side effects there.
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
