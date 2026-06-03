/**
 * Breakout Game Entity Types
 *
 * Core data model types for the breakout game engine.
 * Separated from game.ts to keep the engine file within size limits.
 */

// ==================== Types ====================

export type GameStateType = 'ready' | 'playing' | 'dying' | 'gameover';
export type BrickType = 'normal' | 'bomb' | 'laser' | 'both';
export type DifficultyLevel = 'easy' | 'hard';
export type BulletSpawnType = 'spread' | 'homing' | 'rain' | 'normal';

export interface DifficultyPreset {
  maxLives: number;
  damageMultiplier: number;
  healAmount: number;
  difficultyIncreaseInterval: number; // seconds
  homingMinDifficulty: number;
  laserMinDifficulty: number;
  rainMinDifficulty: number;
  invincibilityDuration: number; // seconds after hit
  scoreMultiplier: number;
  comboMultiplier: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  isPowerShot: boolean;
  powerShotBricksDestroyed: number; // Track bricks destroyed during current power shot
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  hp: number;
  type: BrickType;
  color: string;
  flashTimer: number;
}

export interface Bullet {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  damage: number;
  reflected?: boolean; // true if bullet was reflected by player
}

export interface HomingBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  radius: number;
  color: string;
  turnRate: number;
  damage: number;
  locked: boolean;
  lockedX?: number;
  lockedY?: number;
  reflected?: boolean; // true if bullet was reflected by player
}

export interface Laser {
  x: number;
  width: number;
  timer: number;
  isWarning: boolean;
  hit?: boolean;
}

export interface HomingLaser {
  x: number;
  width: number;
  phase: 'tracking' | 'locked' | 'firing';
  timer: number;
  hit?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  color: string;
}

export interface DeathParticle extends Particle {
  size: number;
  rotation: number;
  rotSpeed: number;
}

export interface BrickConfig {
  rows: number;
  cols: number;
  width: number;
  height: number;
  padding: number;
  offsetTop: number;
  offsetLeft: number;
}

export interface ComboPopup {
  x: number;
  y: number;
  combo: number;
  life: number;
}
