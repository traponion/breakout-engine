import { describe, expect, it } from 'vitest';
import {
  BRICK_COLORS,
  DEFAULT_BRICK_CONFIG,
  calculatePaddleReflection,
  checkBallWallCollision,
  circleRectCollision,
  createBrick,
  resolveBrickCollision,
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
