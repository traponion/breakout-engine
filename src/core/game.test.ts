import { describe, expect, it } from 'vitest';
import {
  BRICK_COLORS,
  DEFAULT_BRICK_CONFIG,
  UI,
  calculatePaddleReflection,
  checkBallWallCollision,
  circleRectCollision,
  computePowerShotCurve,
  computeScore,
  createBrick,
  pitchForCombo,
  pitchForHp,
  resolveBrickCollision,
  volumeFromSliderX,
} from './game';
import type { Ball } from './entities';

describe('circleRectCollision', () => {
  it('detects overlap', () => {
    expect(circleRectCollision(10, 10, 5, 8, 8, 10, 10)).toBe(true);
  });

  it('reports no overlap when far apart', () => {
    expect(circleRectCollision(0, 0, 2, 100, 100, 10, 10)).toBe(false);
  });
});

describe('checkBallWallCollision', () => {
  const ball = (x: number, y: number): Ball => ({
    x,
    y,
    dx: 0,
    dy: 0,
    radius: 5,
    isPowerShot: false,
    powerShotBricksDestroyed: 0,
  });

  it('detects each wall and null in the open field', () => {
    expect(checkBallWallCollision(ball(2, 100), 320, 480)).toBe('left');
    expect(checkBallWallCollision(ball(319, 100), 320, 480)).toBe('right');
    expect(checkBallWallCollision(ball(100, 2), 320, 480)).toBe('top');
    expect(checkBallWallCollision(ball(100, 478), 320, 480)).toBe('bottom');
    expect(checkBallWallCollision(ball(160, 240), 320, 480)).toBeNull();
  });
});

describe('calculatePaddleReflection', () => {
  it('returns zero at the paddle center', () => {
    expect(calculatePaddleReflection(130, 100, 60)).toBe(0);
  });

  it('returns opposite signs on each side of center', () => {
    const left = calculatePaddleReflection(100, 100, 60);
    const right = calculatePaddleReflection(160, 100, 60);
    expect(left).toBeLessThan(0);
    expect(right).toBeGreaterThan(0);
  });
});

describe('resolveBrickCollision', () => {
  it('flips vertical velocity on a shallow vertical hit', () => {
    const result = resolveBrickCollision(
      { x: 50, y: 30, dx: 1, dy: 2, radius: 4 },
      { x: 40, y: 28, width: 30, height: 6 },
    );
    expect(result.dy).toBe(-2);
    expect(result.dx).toBe(1);
  });
});

describe('computePowerShotCurve', () => {
  it('curves right when the ball is left of center', () => {
    expect(computePowerShotCurve(100, 320)).toBe(0.8);
  });

  it('curves left when the ball is right of center', () => {
    expect(computePowerShotCurve(220, 320)).toBe(-0.8);
  });

  it('curves left exactly at center', () => {
    expect(computePowerShotCurve(160, 320)).toBe(-0.8);
  });
});

describe('pitchForHp', () => {
  it('maps known hp values to their configured pitch', () => {
    expect(pitchForHp(3)).toBe(0.85);
    expect(pitchForHp(2)).toBe(1.0);
    expect(pitchForHp(1)).toBe(1.2);
  });

  it('falls back to 1.0 for hp values outside {1,2,3}', () => {
    expect(pitchForHp(0)).toBe(1.0);
    expect(pitchForHp(4)).toBe(1.0);
    expect(pitchForHp(-1)).toBe(1.0);
  });
});

describe('pitchForCombo', () => {
  it('maps combo 1-4 to their configured pitch', () => {
    expect(pitchForCombo(1)).toBe(1.0);
    expect(pitchForCombo(2)).toBe(1.08);
    expect(pitchForCombo(3)).toBe(1.17);
    expect(pitchForCombo(4)).toBe(1.26);
  });

  it('falls back to 1.0 for combo 0 and combo above 4', () => {
    expect(pitchForCombo(0)).toBe(1.0);
    expect(pitchForCombo(5)).toBe(1.0);
  });
});

describe('computeScore', () => {
  it('multiplies base score (10 * combo) by both multipliers and floors the result', () => {
    expect(computeScore(1, 1, 1)).toBe(10);
    expect(computeScore(3, 2.3, 1.1)).toBe(Math.floor(30 * 2.3 * 1.1));
  });

  it('is zero when combo is zero', () => {
    expect(computeScore(0, 2.3, 1.1)).toBe(0);
  });
});

describe('createBrick', () => {
  it('is deterministic given the random inputs', () => {
    const brick = createBrick(10, 20, DEFAULT_BRICK_CONFIG, { hp: 0.5, type: 0.5, color: 0 });
    expect(brick).toMatchObject({
      x: 10,
      y: 20,
      width: DEFAULT_BRICK_CONFIG.width,
      height: DEFAULT_BRICK_CONFIG.height,
      alive: true,
      hp: 1,
      type: 'normal',
      color: BRICK_COLORS[0],
      flashTimer: 0,
    });
  });

  it('assigns higher hp and special types at low random values', () => {
    expect(createBrick(0, 0, DEFAULT_BRICK_CONFIG, { hp: 0.1, type: 0.5, color: 0 }).hp).toBe(3);
    expect(createBrick(0, 0, DEFAULT_BRICK_CONFIG, { hp: 0.5, type: 0.02, color: 0 }).type).toBe(
      'both',
    );
    expect(createBrick(0, 0, DEFAULT_BRICK_CONFIG, { hp: 0.5, type: 0.1, color: 0 }).type).toBe(
      'bomb',
    );
  });
});

describe('volumeFromSliderX', () => {
  const { volumeTrack } = UI.ready;

  it('maps the track ends to 0 and 100', () => {
    expect(volumeFromSliderX(volumeTrack.x)).toBe(0);
    expect(volumeFromSliderX(volumeTrack.x + volumeTrack.w)).toBe(100);
  });

  it('maps the middle of the track to 50', () => {
    expect(volumeFromSliderX(volumeTrack.x + volumeTrack.w / 2)).toBe(50);
  });

  it('clamps positions outside the track', () => {
    expect(volumeFromSliderX(0)).toBe(0);
    expect(volumeFromSliderX(10_000)).toBe(100);
  });
});
