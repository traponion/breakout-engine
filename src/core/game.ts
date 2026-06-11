// Breakout Game Engine

export { MASCOT_COMMENTS, type Lang, type MascotComment } from '../i18n/comments';
import { MASCOT_COMMENTS, type Lang, type MascotComment } from '../i18n/comments';
import { render, TRACK_TITLE_DURATION, LEVEL_UP_DURATION } from '../render/renderer';
import type { RenderContext } from '../render/renderer';
import { BreakoutAudioManager } from '../audio';
import type { BreakoutSEType } from '../audio';
import type { RewardThreshold } from '../config';

export type {
  GameStateType,
  BrickType,
  DifficultyLevel,
  BulletSpawnType,
  DifficultyPreset,
  Ball,
  Paddle,
  Brick,
  Bullet,
  HomingBullet,
  Laser,
  HomingLaser,
  Particle,
  DeathParticle,
  BrickConfig,
  ComboPopup,
} from './entities';
import type {
  GameStateType,
  BrickType,
  DifficultyLevel,
  BulletSpawnType,
  DifficultyPreset,
  Ball,
  Paddle,
  Brick,
  Bullet,
  HomingBullet,
  Laser,
  HomingLaser,
  Particle,
  DeathParticle,
  BrickConfig,
  ComboPopup,
} from './entities';

// ==================== Constants ====================

// Logical game dimensions (coordinate system)
const GAME_WIDTH = 320;
const GAME_HEIGHT = 480;

export const BRICK_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3'];

export const DEFAULT_BRICK_CONFIG: BrickConfig = {
  rows: 5,
  cols: 8,
  width: 35,
  height: 15,
  padding: 4,
  offsetTop: 80,
  offsetLeft: 10,
};

const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPreset> = {
  easy: {
    maxLives: 75,
    damageMultiplier: 0.5,
    healAmount: 2,
    difficultyIncreaseInterval: 20,
    homingMinDifficulty: 3,
    laserMinDifficulty: 2.5,
    rainMinDifficulty: 5,
    invincibilityDuration: 1.5, // 1.5 seconds
    scoreMultiplier: 1,
    comboMultiplier: 1,
  },
  hard: {
    maxLives: 50,
    damageMultiplier: 1,
    healAmount: 1,
    difficultyIncreaseInterval: 10,
    homingMinDifficulty: 2,
    laserMinDifficulty: 1.5,
    rainMinDifficulty: 3,
    invincibilityDuration: 0.5, // 0.5 seconds
    scoreMultiplier: 2.3,
    comboMultiplier: 1.1,
  },
};

// Game balance constants (easily adjustable)
const DAMAGE = { normal: 12, spread: 3, homing: 22, rain: 3, laser: 49, homingLaser: 74 } as const;
const SPAWN_INTERVAL = { homing: 5, laser: 6.67, rain: 8 } as const;
const HOMING = { lockDistance: 150, turnRate: 0.03, initialSpeed: 1.2, lockedSpeed: 3.5 } as const;
const LASER = { warningFrames: 90, fireFrames: 8, width: 30, delayMs: 1500 } as const;
export const HOMING_LASER = {
  trackingFrames: 120, // ~2 sec tracking phase
  lockedFrames: 30, // ~0.5 sec locked/warning phase (tight timing!)
  fireFrames: 15, // longer than normal laser
  width: 30,
  maxWidth: 60, // expands to this width during firing
  spawnInterval: 8, // seconds between spawns
  minDifficulty: 4, // difficulty level to unlock
} as const;
export const PARTICLE = {
  normal: 5,
  death: 20,
  life: 30,
  deathLife: 100,
  deathDuration: 60,
} as const;
const PHYSICS = { paddleReflection: 5, speedPerDifficulty: 0.25, gravity: 0.15 } as const;
const SHAKE = { decay: 0.9, deathDecay: 0.95 } as const;
const HP_DRAIN_FRAMES = 120; // frames to drain full HP bar (~2 s at 60 fps)
const POWER_SHOT = {
  minBricksDestroyed: 3, // Minimum guaranteed bricks to destroy
  curveStrength: 0.8, // dx added on top wall bounce (deterministic curve)
  endZone: 150, // y position where power shot ends (if min bricks met)
} as const;
export const COMMENT = {
  defaultDuration: 180,
  readyDuration: 300,
  typingSpeed: 3,
  maxCharsPerLine: 18,
} as const;
const DANGER_ZONE = {
  startY: 360, // y position where danger zone begins (paddle.y - 100)
  paddleY: 460, // paddle y position
} as const;

// Bullet reflect mechanic - automatic reflection on center hit
export const REFLECT = {
  coreZoneRatio: 0.1, // center 10% (perfect reflection)
  graceZoneRatio: 0.3, // center 30% (full reflection zone)
  grazeDamageRatio: 0.5, // graze damage multiplier
  speedBoost: 1.5, // reflected bullets move faster
  reflectedColor: '#00ff88', // color of reflected bullets
  scoreBonus: 50, // score per reflected bullet
} as const;

// Trail effect: number of past positions to retain (also used as initial life value)
// Combo popup duration in frames
export const COMBO_POPUP_LIFE = 40;

// Brick hit flash duration in frames
export const BRICK_FLASH_LIFE = 6;

// Ball visibility aid - shows when ball is in upper area (behind bricks)
export const BALL_VISIBILITY = {
  markerY: 470, // y position for marker arrow
  markerThreshold: 200, // show marker when ball.y is below this value
} as const;

// UI button definitions for Canvas-based menus
interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const UI = {
  muteBtn: { x: 284, y: 8, w: 28, h: 28 },
  ready: {
    easyBtn: { x: 60, y: 350, w: 80, h: 32 },
    hardBtn: { x: 180, y: 350, w: 80, h: 32 },
    // SE volume slider between the title and the difficulty buttons.
    // volumeHit is the generous pointer target; volumeTrack is the visual bar.
    volumeTrack: { x: 95, y: 314, w: 130, h: 6 },
    volumeHit: { x: 60, y: 300, w: 200, h: 32 },
  },
  gameover: {
    retryBtn: { x: 110, y: 420, w: 100, h: 36 },
  },
  labels: {
    ja: {
      easy: 'やさしい',
      hard: 'むずかしい',
      retry: 'Retry',
      gameover: 'GAME OVER',
    },
    en: {
      easy: 'Easy',
      hard: 'Hard',
      retry: 'Retry',
      gameover: 'GAME OVER',
    },
  },
} as const;

// Mascot face images resolved by convention (see DESIGN.md). Users swap the files
// in place; the engine never hard-codes a specific character.
const MASCOT_FACE_STATES = ['normal', 'sad', 'cry', 'surprised', 'shy', 'sparkle'] as const;
const MASCOT_FACE_PATHS: string[] = MASCOT_FACE_STATES.map(
  (state) => `assets/mascot/face-${state}.webp`,
);

// ==================== Pure Functions (Testable) ====================

export function circleRectCollision(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  return cx + radius > rx && cx - radius < rx + rw && cy + radius > ry && cy - radius < ry + rh;
}

export function checkBallWallCollision(
  ball: Ball,
  canvasWidth: number,
  canvasHeight: number,
): 'left' | 'right' | 'top' | 'bottom' | null {
  if (ball.x - ball.radius < 0) return 'left';
  if (ball.x + ball.radius > canvasWidth) return 'right';
  if (ball.y - ball.radius < 0) return 'top';
  if (ball.y + ball.radius > canvasHeight) return 'bottom';
  return null;
}

export function calculatePaddleReflection(
  ballX: number,
  paddleX: number,
  paddleWidth: number,
): number {
  const hitPos = (ballX - paddleX) / paddleWidth;
  return PHYSICS.paddleReflection * (hitPos - 0.5);
}

// Resolve ball-brick collision: returns adjusted ball position and velocity
export function resolveBrickCollision(
  ball: { x: number; y: number; dx: number; dy: number; radius: number },
  brick: { x: number; y: number; width: number; height: number },
): { x: number; y: number; dx: number; dy: number } {
  const brickCenterX = brick.x + brick.width / 2;
  const brickCenterY = brick.y + brick.height / 2;
  const overlapX = ball.x - brickCenterX;
  const overlapY = ball.y - brickCenterY;
  const penetrationX = brick.width / 2 + ball.radius - Math.abs(overlapX);
  const penetrationY = brick.height / 2 + ball.radius - Math.abs(overlapY);

  if (penetrationX < penetrationY) {
    return {
      x: ball.x + (overlapX > 0 ? penetrationX : -penetrationX),
      y: ball.y,
      dx: -ball.dx,
      dy: ball.dy,
    };
  }
  return {
    x: ball.x,
    y: ball.y + (overlapY > 0 ? penetrationY : -penetrationY),
    dx: ball.dx,
    dy: -ball.dy,
  };
}

export function createBrick(
  x: number,
  y: number,
  config: BrickConfig,
  random: { hp: number; type: number; color: number },
): Brick {
  let hp = 1;
  if (random.hp < 0.15) hp = 3;
  else if (random.hp < 0.4) hp = 2;

  let type: BrickType = 'normal';
  if (random.type < 0.05) type = 'both';
  else if (random.type < 0.18) type = 'bomb';
  else if (random.type < 0.28) type = 'laser';

  const color = BRICK_COLORS[Math.floor(random.color * BRICK_COLORS.length)] ?? '#ff6b6b';
  return {
    x,
    y,
    width: config.width,
    height: config.height,
    alive: true,
    hp,
    type,
    color,
    flashTimer: 0,
  };
}

// ==================== Game Engine Class ====================

export interface BreakoutGameOptions {
  /** Called when the game transitions to gameover state (natural game over only) */
  onGameOver?: () => void;
  /** Score → reward image thresholds shown on game over. Defaults to none. */
  rewards?: RewardThreshold[];
  /** When false, mascot speech bubbles are suppressed. Defaults to true. */
  showMascotComments?: boolean;
  /** Initial SE volume (0–100); a setting stored by the in-game slider wins. */
  seVolume?: number;
  /** Per-SE audio file paths; missing entries use the assets/sounds convention. */
  sounds?: Partial<Record<BreakoutSEType, string>>;
}

/** Map a canvas x coordinate on the ready-screen slider track to a 0–100 volume. */
export function volumeFromSliderX(x: number): number {
  const { volumeTrack } = UI.ready;
  return Math.max(0, Math.min(100, Math.round(((x - volumeTrack.x) / volumeTrack.w) * 100)));
}

const canvasGameMap = new WeakMap<HTMLCanvasElement, BreakoutGame>();

// Get current game for a canvas (avoids stale references via WeakMap)
export function getCurrentGame(canvas: HTMLCanvasElement): BreakoutGame | null {
  return canvasGameMap.get(canvas) ?? null;
}

export class BreakoutGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly canvasWidth: number;
  private readonly canvasHeight: number;
  private _gameState: GameStateType = 'ready';
  private _score = 0;
  private _lives: number;
  private _displayLives: number; // animated HP — drains toward _lives on damage
  private _maxLives: number;
  private _difficultyLevel: DifficultyLevel;
  private preset: DifficultyPreset;
  private frameCount = 0;
  private sessionId = 0;
  private trackTitleText: string | null = null;
  private trackTitleTimer = 0; // counts down from 150; <=0 means static badge mode
  private levelUpText: string | null = null;
  private levelUpTimer = 0; // counts down from LEVEL_UP_DURATION; <=0 means hidden
  private lastFrameTime = 0;
  private dt = 1;
  private gameTime = 0;
  private lastSpawn = { difficulty: 0, homing: 0, laser: 0, rain: 0, homingLaser: 0 };
  private lastHomingLockSE = 0;
  private pendingStart = false;
  private animationId = 0;
  private ball: Ball = {
    x: 160,
    y: 400,
    dx: 3,
    dy: -3,
    radius: 8,
    isPowerShot: false,
    powerShotBricksDestroyed: 0,
  };
  private paddle: Paddle = { x: 130, y: 460, width: 60, height: 10 };
  private bricks: Brick[] = [];
  private bullets: Bullet[] = [];
  private homingBullets: HomingBullet[] = [];
  private lasers: Laser[] = [];
  private homingLasers: HomingLaser[] = [];
  private particles: Particle[] = [];
  private deathParticles: DeathParticle[] = [];
  private comboPopups: ComboPopup[] = [];
  private combo = 0;
  private _difficulty = 1;
  private destroyedCount = 0;
  private deathTimer = 0;
  private invincibleTimer = 0;
  private warning = '';
  private warningTimer = 0;
  private screenShake = 0;
  private lang: Lang;
  private readonly options: BreakoutGameOptions;
  private readonly rewards: RewardThreshold[];
  private readonly showComments: boolean;
  private readonly audio: BreakoutAudioManager;
  private volumeDragging = false;
  // A slider drag can end on top of a button; the click that follows the
  // release must not start the game. Cleared on the next pointer-down.
  private suppressReadyClick = false;
  private mascot = {
    comment: '',
    displayText: '',
    charIndex: 0,
    timer: 0,
    typingAccum: 0,
    icon: null as HTMLImageElement | null,
    iconLoaded: false,
    iconCache: {} as Record<string, HTMLImageElement>,
  };
  private rewardImages: Record<string, HTMLImageElement> = {};
  private rewardImagesLoaded = false;
  private iconsLoaded = false;
  private iconsLoadedCount = 0;

  constructor(
    canvas: HTMLCanvasElement,
    lang: Lang = 'ja',
    difficultyLevel: DifficultyLevel = 'hard',
    options: BreakoutGameOptions = {},
  ) {
    // Prevent multiple games on same canvas
    canvasGameMap.get(canvas)?.stop();
    canvasGameMap.set(canvas, this);
    this.options = options;
    this.rewards = options.rewards ?? [];
    this.showComments = options.showMascotComments ?? true;
    this.audio = new BreakoutAudioManager({
      seVolume: options.seVolume,
      sounds: options.sounds,
    });

    this.canvas = canvas;
    // Use logical dimensions for game coordinate system
    this.canvasWidth = GAME_WIDTH;
    this.canvasHeight = GAME_HEIGHT;

    // HiDPI/Retina support: scale canvas buffer for sharp rendering
    // Use minimum 3x to prevent blurriness when expanded on low-dpr (PC) displays
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.max(3, dpr);
    canvas.width = GAME_WIDTH * scale;
    canvas.height = GAME_HEIGHT * scale;
    // Canvas size is now controlled by CSS (responsive design)

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2d context');
    context.scale(scale, scale);
    this.ctx = context;
    this.lang = lang;
    this._difficultyLevel = difficultyLevel;
    this.preset = DIFFICULTY_PRESETS[difficultyLevel];
    this._maxLives = this.preset.maxLives;
    this._lives = this._maxLives;
    this._displayLives = this._maxLives;
    this.preloadIcons();
    this.preloadRewardImages();
    this.setupBricks();
    this.showMascotComment('ready', COMMENT.readyDuration);
    this.draw();
    this.readyLoop();
  }

  get gameState(): GameStateType {
    return this._gameState;
  }
  get score(): number {
    return this._score;
  }
  get lives(): number {
    return this._lives;
  }
  get maxLives(): number {
    return this._maxLives;
  }
  get difficulty(): number {
    return this._difficulty;
  }
  get difficultyLevel(): DifficultyLevel {
    return this._difficultyLevel;
  }

  stop(): void {
    if (canvasGameMap.get(this.canvas) === this) {
      canvasGameMap.delete(this.canvas);
    }
    this._gameState = 'gameover';
    this.audio.stopBGM();
    cancelAnimationFrame(this.animationId);
  }

  start(): void {
    if (this._gameState !== 'ready') return;
    this.audio.unlock();
    if (!this.audio.isReady()) return; // Wait for decode — readyLoop will retry
    cancelAnimationFrame(this.animationId);
    this._gameState = 'playing';
    this.lastFrameTime = 0;
    this.gameTime = 0;
    this.lastSpawn = { difficulty: 0, homing: 0, laser: 0, rain: 0, homingLaser: 0 };
    // Audio is a silent stub in this build; playBGM returns null and no track title shows.
    this.audio.playBGM(this._difficultyLevel);
    this.trackTitleText = null;
    this.trackTitleTimer = TRACK_TITLE_DURATION;
    this.showMascotComment('start');
    this.animationId = requestAnimationFrame((t) => {
      this.gameLoop(t);
    });
  }

  restart(): void {
    this.audio.stopBGM();
    cancelAnimationFrame(this.animationId);
    this.sessionId++;
    Object.assign(this, {
      _score: 0,
      _lives: this._maxLives,
      _displayLives: this._maxLives,
      combo: 0,
      _difficulty: 1,
      bullets: [],
      homingBullets: [],
      lasers: [],
      homingLasers: [],
      particles: [],
      deathParticles: [],
      deathTimer: 0,
      invincibleTimer: 0,
      frameCount: 0,
      warning: '',
      warningTimer: 0,
      screenShake: 0,
      destroyedCount: 0,
      lastFrameTime: 0,
      dt: 1,
      gameTime: 0,
      lastSpawn: { difficulty: 0, homing: 0, laser: 0, rain: 0, homingLaser: 0 },
      _gameState: 'ready' as const,
      trackTitleText: null,
      trackTitleTimer: 0,
      levelUpText: null,
      levelUpTimer: 0,
      comboPopups: [],
    });
    this.resetBall();
    this.setupBricks();
    this.showMascotComment('ready', COMMENT.readyDuration);
    this.draw();
    this.readyLoop();
  }

  handleMouseMove(clientX: number, clientY: number): void {
    const { x } = this.toCanvasCoords(clientX, clientY);
    if (this.volumeDragging && this._gameState === 'ready') {
      this.audio.setSEVolume(volumeFromSliderX(x));
      return;
    }
    if (this._gameState !== 'playing') return;
    this.paddle.x = Math.max(
      0,
      Math.min(x - this.paddle.width / 2, this.canvasWidth - this.paddle.width),
    );
  }

  handleTouchMove(clientX: number, clientY: number): void {
    this.handleMouseMove(clientX, clientY);
  }

  handleTouchStart(clientX?: number, clientY?: number): void {
    if (clientX === undefined || clientY === undefined) return;
    const { x, y } = this.toCanvasCoords(clientX, clientY);
    // Mute button works in all states including gameplay
    if (this.isInButton(x, y, UI.muteBtn)) {
      this.audio.toggleMute();
      return;
    }
    this.handlePointerDown(clientX, clientY);
    if (this.volumeDragging) return; // slider grab — not a tap
    if (this._gameState !== 'playing') {
      this.handleClick(clientX, clientY);
    }
  }

  /** Pointer-down (mouse or touch). Starts slider drags on the ready screen. */
  handlePointerDown(clientX: number, clientY: number): void {
    this.suppressReadyClick = false;
    const { x, y } = this.toCanvasCoords(clientX, clientY);
    if (this._gameState === 'ready' && this.isInButton(x, y, UI.ready.volumeHit)) {
      this.volumeDragging = true;
      this.audio.setSEVolume(volumeFromSliderX(x));
    }
  }

  /** Pointer-up. A valid activation event — attempt unlock, then end slider drags. */
  handlePointerUp(): void {
    // mouseup/touchend are the events WebKit counts as activation (touchstart
    // is not), so this is the reliable unlock point on touch devices.
    this.audio.unlock();
    if (!this.volumeDragging) return;
    this.volumeDragging = false;
    this.suppressReadyClick = true;
    // Audible feedback so the player can judge the chosen level by ear
    this.audio.playSE('paddleHit');
  }

  handleTouchEnd(): void {
    this.handlePointerUp();
  }

  handleClick(clientX: number, clientY: number): void {
    // click is an activation event WebKit accepts for audio; unlock is retry-safe
    this.audio.unlock();
    const { x, y } = this.toCanvasCoords(clientX, clientY);

    if (this.isInButton(x, y, UI.muteBtn)) {
      this.audio.toggleMute();
      return;
    }

    switch (this._gameState) {
      case 'ready': {
        this.handleReadyClick(x, y);
        break;
      }
      case 'playing': {
        // No manual reflect trigger - automatic on center hit
        break;
      }
      case 'gameover': {
        this.handleGameOverClick(x, y);
        break;
      }
    }
  }

  private handleReadyClick(x: number, y: number): void {
    if (!this.iconsLoaded || this.pendingStart) return;
    if (this.suppressReadyClick) {
      this.suppressReadyClick = false;
      return;
    }
    // Slider interaction is handled on pointer-down/up; don't treat it as a start
    if (this.isInButton(x, y, UI.ready.volumeHit)) return;

    const { easyBtn, hardBtn } = UI.ready;
    if (this.isInButton(x, y, easyBtn)) {
      this.setDifficulty('easy');
    } else if (this.isInButton(x, y, hardBtn)) {
      this.setDifficulty('hard');
    } else {
      return;
    }
    // Unlock AudioContext in user gesture, then wait for decode in readyLoop
    this.audio.unlock();
    this.pendingStart = true;
  }

  private handleGameOverClick(x: number, y: number): void {
    if (this.isInButton(x, y, UI.gameover.retryBtn)) {
      this.restart();
    }
  }

  // Check which reflect zone a bullet is in (automatic reflection on center hit)
  private getReflectZone(bulletX: number, bulletY: number): 'core' | 'graze' | 'none' {
    const { paddle } = this;
    // Only reflect bullets near the paddle (same vertical position)
    if (bulletY < paddle.y - 5 || bulletY > paddle.y + paddle.height) return 'none';

    const paddleCenter = paddle.x + paddle.width / 2;
    const distanceFromCenter = Math.abs(bulletX - paddleCenter);
    const coreHalfWidth = (paddle.width * REFLECT.coreZoneRatio) / 2;
    const graceHalfWidth = (paddle.width * REFLECT.graceZoneRatio) / 2;

    if (distanceFromCenter <= coreHalfWidth) return 'core';
    if (distanceFromCenter <= graceHalfWidth) return 'graze';
    return 'none';
  }

  // Reflect a normal bullet (returns true if reflected)
  private tryReflectBullet(b: Bullet): boolean {
    if (b.reflected || b.dy <= 0) return false;
    const zone = this.getReflectZone(b.x, b.y);
    if (zone === 'none') return false;

    // Apply graze damage if not in core zone
    if (zone === 'graze') {
      const grazeDamage = DAMAGE.normal * REFLECT.grazeDamageRatio;
      this.applyDamage(b.x, b.y, grazeDamage, 3, '#ffaa00');
    }

    // Reflect bullet
    b.dy = -Math.abs(b.dy) * REFLECT.speedBoost;
    b.dx *= 0.5;
    b.color = REFLECT.reflectedColor;
    b.reflected = true;
    this._score += REFLECT.scoreBonus;
    this.spawnParticle(b.x, b.y, REFLECT.reflectedColor);
    this.screenShake = 8;
    this.audio.playSE('reflect');
    this.showMascotComment('reflect');
    return true;
  }

  // Reflect a homing bullet (returns true if reflected)
  private tryReflectHomingBullet(b: HomingBullet): boolean {
    if (b.reflected || b.vy <= 0) return false;
    const zone = this.getReflectZone(b.x, b.y);
    if (zone === 'none') return false;

    // Apply graze damage if not in core zone
    if (zone === 'graze') {
      const grazeDamage = DAMAGE.homing * REFLECT.grazeDamageRatio;
      this.applyDamage(b.x, b.y, grazeDamage, 5, '#ffaa00');
    }

    // Reflect bullet
    b.vy = -Math.abs(b.vy) * REFLECT.speedBoost;
    b.vx = 0;
    b.color = REFLECT.reflectedColor;
    b.reflected = true;
    b.locked = false;
    this._score += REFLECT.scoreBonus * 2;
    this.spawnParticle(b.x, b.y, REFLECT.reflectedColor);
    this.screenShake = 8;
    this.audio.playSE('reflect');
    this.showMascotComment('reflect');
    return true;
  }

  private toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvasWidth / rect.width),
      y: (clientY - rect.top) * (this.canvasHeight / rect.height),
    };
  }

  private isInButton(x: number, y: number, button: ButtonRect): boolean {
    return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
  }

  setDifficulty(level: DifficultyLevel): void {
    if (this._gameState !== 'ready') return;
    this._difficultyLevel = level;
    this.preset = DIFFICULTY_PRESETS[level];
    this._maxLives = this.preset.maxLives;
    this._lives = this._maxLives;
    this._displayLives = this._maxLives;
  }

  private preloadIcons(): void {
    const totalIcons = MASCOT_FACE_PATHS.length;
    for (const path of MASCOT_FACE_PATHS) {
      const img = new Image();
      img.addEventListener('load', () => {
        this.mascot.iconCache[path] = img;
        this.iconsLoadedCount++;
        if (this.iconsLoadedCount >= totalIcons) {
          this.iconsLoaded = true;
        }
      });
      img.src = path;
    }
  }

  private preloadRewardImages(): void {
    const images = this.rewards;
    if (images.length === 0) {
      this.rewardImagesLoaded = true;
      return;
    }
    let loadedCount = 0;
    const onComplete = (): void => {
      loadedCount++;
      if (loadedCount === images.length) {
        this.rewardImagesLoaded = true;
      }
    };
    for (const { src } of images) {
      const img = new Image();
      img.addEventListener('load', () => {
        this.rewardImages[src] = img;
        onComplete();
      });
      img.addEventListener('error', onComplete);
      img.src = src;
    }
  }

  private getRewardImageForScore(score: number): HTMLImageElement | null {
    // Pick the reward with the highest threshold not exceeding the score.
    let selected: RewardThreshold | undefined;
    for (const reward of this.rewards) {
      if (score >= reward.minScore && (!selected || reward.minScore >= selected.minScore)) {
        selected = reward;
      }
    }
    if (!selected) return null;
    return this.rewardImages[selected.src] ?? null;
  }

  private setupBricks(): void {
    this.bricks = [];
    const config = DEFAULT_BRICK_CONFIG;
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        const x = config.offsetLeft + c * (config.width + config.padding);
        const y = config.offsetTop + r * (config.height + config.padding);
        this.bricks.push(
          createBrick(x, y, config, {
            hp: Math.random(),
            type: Math.random(),
            color: Math.random(),
          }),
        );
      }
    }
  }

  private resetBall(): void {
    const { ball } = this;
    ball.x = this.canvasWidth / 2;
    ball.y = this.canvasHeight - 50;
    ball.dx = 3 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -3;
    ball.isPowerShot = false;
    ball.powerShotBricksDestroyed = 0;
  }

  private addNewRow(): void {
    const config = DEFAULT_BRICK_CONFIG;
    this.bricks = this.bricks.filter((b) => b.alive);
    for (const brick of this.bricks) brick.y += config.height + config.padding;
    for (let c = 0; c < config.cols; c++) {
      const x = config.offsetLeft + c * (config.width + config.padding);
      this.bricks.push(
        createBrick(x, config.offsetTop, config, {
          hp: Math.random(),
          type: Math.random(),
          color: Math.random(),
        }),
      );
    }
    this.audio.playSE('newRow');
  }

  private showMascotComment(situation: string, duration: number = COMMENT.defaultDuration): void {
    if (!this.showComments) return;
    const langComments = MASCOT_COMMENTS[this.lang] as Record<string, MascotComment[] | undefined>;
    const comments = langComments[situation];
    if (!comments || comments.length === 0) return;
    const chosen = comments[Math.floor(Math.random() * comments.length)];
    if (!chosen) return;
    const n = this.mascot;
    n.comment = chosen.text;
    n.displayText = '';
    n.charIndex = 0;
    n.timer = duration;
    n.typingAccum = 0;
    const cached = n.iconCache[chosen.icon];
    if (cached) {
      n.icon = cached;
      n.iconLoaded = true;
      return;
    }
    n.iconLoaded = false;
    const img = new Image();
    img.addEventListener('load', () => {
      n.iconCache[chosen.icon] = img;
      n.icon = img;
      n.iconLoaded = true;
    });
    img.src = chosen.icon;
  }

  private updateMascotComment(): void {
    const n = this.mascot;
    if (n.timer <= 0) return;
    n.timer -= this.dt;
    if (n.charIndex >= n.comment.length) return;
    n.typingAccum += this.dt;
    while (n.typingAccum >= COMMENT.typingSpeed && n.charIndex < n.comment.length) {
      n.typingAccum -= COMMENT.typingSpeed;
      n.charIndex++;
      n.displayText = n.comment.slice(0, n.charIndex);
    }
  }

  private readyLoop(timestamp?: number): void {
    if (this._gameState !== 'ready') return;
    if (this.pendingStart && this.audio.isReady()) {
      this.pendingStart = false;
      this.start();
      return;
    }
    if (this.lastFrameTime === 0) this.lastFrameTime = timestamp ?? performance.now();
    const now = timestamp ?? performance.now();
    this.dt = Math.min((now - this.lastFrameTime) / 16.667, 3);
    this.lastFrameTime = now;
    this.frameCount++;
    if (this.mascot.timer <= 0) this.showMascotComment('ready', COMMENT.readyDuration);
    this.updateMascotComment();
    this.draw();
    this.animationId = requestAnimationFrame((t) => {
      this.readyLoop(t);
    });
  }

  private gameLoop(timestamp: number): void {
    if (this.lastFrameTime === 0) this.lastFrameTime = timestamp;
    const deltaMs = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;
    this.dt = Math.min(deltaMs / 16.667, 3);
    this.gameTime += deltaMs / 1000;
    this.frameCount++;

    if (this._gameState === 'playing') {
      this.update();
    } else if (this._gameState === 'dying') {
      this.updateDeathAnimation();
    }
    // gameover state: just keep drawing the screen

    this.updateMascotComment();
    this.draw();
    this.animationId = requestAnimationFrame((t) => {
      this.gameLoop(t);
    });
  }

  private update(): void {
    this.updateDifficulty();
    this.updateSpawns();
    const isDead = this.updateBallPhysics();
    if (isDead) return;
    this.updatePaddleCollision();
    this.updateBrickCollisions();
    if (this.checkBrickReachedPaddle()) return;
    this.updateBullets();
    this.updateHomingBullets();
    this.updateLasers();
    this.updateHomingLasers();
    this.updateParticles();
    this.updateEffects();
    this.updateTimers();
  }

  private updateEffects(): void {
    for (const p of this.comboPopups) p.life -= this.dt;
    this.comboPopups = this.comboPopups.filter((p) => p.life > 0);
    for (const b of this.bricks) {
      if (b.flashTimer > 0) b.flashTimer -= this.dt;
    }
  }

  private checkBrickReachedPaddle(): boolean {
    const { paddle } = this;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (b.y + b.height >= paddle.y) {
        this._lives = 0;
        this.startDeathAnimation();
        return true;
      }
    }
    return false;
  }

  // Calculate danger level (0-1) based on lowest brick position
  private calculateDangerLevel(): number {
    let lowestY = 0;
    for (const b of this.bricks) {
      if (b.alive && b.y + b.height > lowestY) {
        lowestY = b.y + b.height;
      }
    }
    if (lowestY < DANGER_ZONE.startY) return 0;
    const progress = (lowestY - DANGER_ZONE.startY) / (DANGER_ZONE.paddleY - DANGER_ZONE.startY);
    return Math.min(1, Math.max(0, progress));
  }

  private updateDifficulty(): void {
    if (this.gameTime - this.lastSpawn.difficulty >= this.preset.difficultyIncreaseInterval) {
      const prev = this._difficulty;
      this._difficulty += 0.5;
      this.lastSpawn.difficulty = this.gameTime;
      this.audio.playSE('diffUp');
      this.levelUpTimer = LEVEL_UP_DURATION;
      // Detect newly unlocked enemy types and show a specific notice
      const { preset } = this;
      if (prev < HOMING_LASER.minDifficulty && this._difficulty >= HOMING_LASER.minDifficulty) {
        this.levelUpText = 'HOMING LASER UNLOCKED';
      } else if (prev < preset.rainMinDifficulty && this._difficulty >= preset.rainMinDifficulty) {
        this.levelUpText = 'RAIN UNLOCKED';
      } else if (
        prev < preset.homingMinDifficulty &&
        this._difficulty >= preset.homingMinDifficulty
      ) {
        this.levelUpText = 'HOMING UNLOCKED';
      } else if (
        prev < preset.laserMinDifficulty &&
        this._difficulty >= preset.laserMinDifficulty
      ) {
        this.levelUpText = 'LASER UNLOCKED';
      } else {
        this.levelUpText = `LV.${this._difficulty.toFixed(1)}`;
      }
    }
  }

  private updateSpawns(): void {
    const { preset, gameTime: t, lastSpawn: ls } = this;
    if (t - ls.homing >= SPAWN_INTERVAL.homing && this._difficulty >= preset.homingMinDifficulty) {
      this.spawnBullet(30 + Math.random() * (this.canvasWidth - 60), -10, 'homing');
      ls.homing = t;
    }
    // Laser spawning: homing laser replaces normal laser at higher difficulty
    if (t - ls.laser >= SPAWN_INTERVAL.laser && this._difficulty >= preset.laserMinDifficulty) {
      if (this._difficulty >= HOMING_LASER.minDifficulty) {
        this.spawnHomingLaser();
      } else {
        this.spawnLaser(Math.random() * (this.canvasWidth - LASER.width));
      }
      ls.laser = t;
    }
    if (t - ls.rain >= SPAWN_INTERVAL.rain && this._difficulty >= preset.rainMinDifficulty) {
      this.spawnBullet(0, 0, 'rain');
      this.audio.playSE('rain');
      ls.rain = t;
    }
  }

  private updateBallPhysics(): boolean {
    const { ball } = this;
    const speedMult = 1 + (this._difficulty - 1) * PHYSICS.speedPerDifficulty;
    ball.x += ball.dx * speedMult * this.dt;
    ball.y += ball.dy * speedMult * this.dt;

    // Use stored dimensions to avoid CSS scaling issues
    const wallHit = checkBallWallCollision(ball, this.canvasWidth, this.canvasHeight);
    if (wallHit === 'left' || wallHit === 'right') {
      ball.dx = -ball.dx;
      ball.x = wallHit === 'left' ? ball.radius : this.canvasWidth - ball.radius;
      this.audio.playSE('wallBounce');
    }
    if (wallHit === 'top') {
      ball.dy = -ball.dy;
      ball.y = ball.radius;
      this.audio.playSE('wallBounce');
      // End power shot on top wall + apply deterministic curve to prevent infinite loop
      if (ball.isPowerShot) {
        ball.isPowerShot = false;
        // Curve direction based on ball position (deterministic, player can predict!)
        ball.dx =
          ball.x < this.canvasWidth / 2 ? POWER_SHOT.curveStrength : -POWER_SHOT.curveStrength;
      }
    }
    if (wallHit === 'bottom') {
      this._lives = 0;
      this.combo = 0;
      this.startDeathAnimation();
      return true;
    }
    return false;
  }

  private updatePaddleCollision(): void {
    const { ball, paddle } = this;
    if (
      ball.y + ball.radius > paddle.y &&
      ball.y + ball.radius < paddle.y + paddle.height + ball.radius &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.dy > 0
    ) {
      // Check for center hit (within 5% of paddle center) for power shot
      const hitPos = (ball.x - paddle.x) / paddle.width; // 0 to 1
      const isCenterHit = Math.abs(hitPos - 0.5) < 0.025; // 5% zone (super tight!)

      // Always reset to base speed to prevent acceleration stacking
      const baseSpeed = 3;

      if (isCenterHit) {
        ball.isPowerShot = true;
        ball.powerShotBricksDestroyed = 0; // Reset counter on new power shot
        ball.dy = -baseSpeed * 1.5; // Fixed power shot speed
        ball.dx = 0; // Straight up for power shot
        this.audio.playSE('powerShot');
        this.showMascotComment('powershot');
      } else {
        ball.isPowerShot = false;
        ball.dy = -baseSpeed;
        ball.dx = calculatePaddleReflection(ball.x, paddle.x, paddle.width);
      }
      ball.y = paddle.y - ball.radius;
      this.audio.playSE('paddleHit');
    }
  }

  private updateBrickCollisions(): void {
    const { ball } = this;
    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (!circleRectCollision(ball.x, ball.y, ball.radius, b.x, b.y, b.width, b.height)) continue;

      if (ball.isPowerShot) {
        this.handlePowerShotBrickHit(b);
      } else {
        this.handleNormalBrickHit(b);
        break; // Normal mode: one brick per frame
      }
    }
    this.checkPowerShotEnd();
  }

  // Power shot: instant kill, pure penetration, no gimmicks
  private handlePowerShotBrickHit(b: Brick): void {
    const { ball } = this;
    b.hp = 0;
    ball.powerShotBricksDestroyed++;
    this.screenShake = 15;
    this.spawnParticle(b.x + b.width / 2, b.y + b.height / 2, '#ffff00');
    this.spawnParticle(b.x + b.width / 2, b.y + b.height / 2, '#ff8800');
    this.handleBrickDestruction(b);
  }

  // Normal hit: proper collision resolution with gimmicks
  private handleNormalBrickHit(b: Brick): void {
    const { ball } = this;
    const resolved = resolveBrickCollision(ball, b);
    ball.x = resolved.x;
    ball.y = resolved.y;
    ball.dx = resolved.dx;
    ball.dy = resolved.dy;
    b.hp--;
    this.handleBrickTypeEffect(b);
    if (b.hp <= 0) this.handleBrickDestruction(b);
    else {
      b.flashTimer = BRICK_FLASH_LIFE;
      // Higher pitch = closer to breaking: hp3→low, hp2→mid, hp1→high
      const hitRates: Record<number, number> = { 3: 0.85, 2: 1.0, 1: 1.2 };
      this.audio.playSE('blockHit', hitRates[b.hp] ?? 1.0);
    }
  }

  // Check if power shot should end
  private checkPowerShotEnd(): void {
    const { ball } = this;
    if (!ball.isPowerShot) return;
    // Power shot ends when: reached end zone AND minimum bricks destroyed
    // Note: top wall bounce also ends power shot (handled in updateBallPhysics)
    if (
      ball.y < POWER_SHOT.endZone &&
      ball.powerShotBricksDestroyed >= POWER_SHOT.minBricksDestroyed
    ) {
      ball.isPowerShot = false;
    }
  }

  private handleBrickTypeEffect(b: Brick): void {
    if (b.type === 'bomb' || b.type === 'both') {
      this.spawnBullet(b.x + b.width / 2, b.y + b.height, 'spread');
      this.screenShake = 8;
    }
    if (b.type === 'laser' || b.type === 'both') {
      this.spawnLaser(b.x);
    }
  }

  private handleBrickDestruction(b: Brick, reflected = false): void {
    b.alive = false;
    this.combo++;
    if (this.combo >= 2) {
      this.comboPopups.push({
        x: b.x + b.width / 2,
        y: b.y,
        combo: this.combo,
        life: COMBO_POPUP_LIFE,
      });
    }
    const baseScore = 10 * this.combo;
    const { scoreMultiplier, comboMultiplier } = this.preset;
    this._score += Math.floor(baseScore * scoreMultiplier * comboMultiplier);
    this.spawnParticle(b.x + b.width / 2, b.y + b.height / 2, '#ffd700');
    this._lives = Math.min(this._lives + this.preset.healAmount, this._maxLives);
    // Combo-scaled block break SE: pitch rises with combo, MAX at 5+
    if (this.combo >= 5) {
      this.audio.playSE('blockBreakMax');
    } else {
      const comboRates = [1.0, 1.08, 1.17, 1.26];
      this.audio.playSE('blockBreak', comboRates[this.combo - 1] ?? 1.0);
    }
    if (this.combo >= 5 && this.combo % 5 === 0) this.showMascotComment('combo');
    else if (Math.random() < 0.15) this.showMascotComment('destroy');
    if (!reflected && b.type === 'normal' && Math.random() < 0.4 + this._difficulty * 0.1)
      this.spawnBullet(b.x + b.width / 2, b.y + b.height, 'normal');
    this.destroyedCount++;
    if (this.destroyedCount % 8 === 0) this.addNewRow();
  }

  private updateTimers(): void {
    if (this.warningTimer > 0) this.warningTimer -= this.dt;
    else this.warning = '';
    if (this.screenShake > 0) this.screenShake *= Math.pow(SHAKE.decay, this.dt);
    if (this.invincibleTimer > 0) this.invincibleTimer -= this.dt;
    if (this.trackTitleTimer > 0) this.trackTitleTimer -= this.dt;
    if (this.levelUpTimer > 0) this.levelUpTimer -= this.dt;
    // Drooling HP: drain display toward actual; snap up instantly on heal
    if (this._displayLives > this._lives) {
      const drainRate = (this._maxLives / HP_DRAIN_FRAMES) * this.dt;
      this._displayLives = Math.max(this._lives, this._displayLives - drainRate);
    } else {
      this._displayLives = this._lives;
    }
    // MOTHER-style death: trigger when animated HP drains to zero (heal can cancel)
    if (this._displayLives <= 0 && this._gameState === 'playing') {
      this._displayLives = 0;
      this.startDeathAnimation();
    }
  }

  private applyDamage(x: number, y: number, rawDamage: number, shake: number, color: string): void {
    // Skip damage during invincibility
    if (this.invincibleTimer > 0) return;

    const actualDamage = Math.ceil(rawDamage * this.preset.damageMultiplier);
    this._lives -= actualDamage;
    this.combo = 0;
    this.screenShake = shake;
    this.spawnParticle(x, y, color);
    // Damage SE: severity based on screen shake intensity
    if (shake <= 10) this.audio.playSE('damageLight');
    else if (shake <= 30) this.audio.playSE('damageMid');
    else this.audio.playSE('damageHeavy');
    this.showMascotComment('hit');

    if (this._lives <= 0) {
      this._lives = Math.max(0, this._lives);
      // Do not trigger death here — wait for _displayLives to drain to 0 (MOTHER-style)
    } else {
      // Start invincibility period
      this.invincibleTimer = this.preset.invincibilityDuration;
    }
  }

  // Check if reflected bullet hits a brick; returns true if hit
  private checkReflectedBulletBrickHit(x: number, y: number, radius: number): boolean {
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      if (!circleRectCollision(x, y, radius, brick.x, brick.y, brick.width, brick.height)) continue;
      // Reflected bullets destroy any brick in one hit (reward for successful reflect)
      brick.hp = 0;
      this.handleBrickDestruction(brick, true);
      this.spawnParticle(x, y, REFLECT.reflectedColor);
      this.screenShake = 5;
      return true;
    }
    return false;
  }

  private updateBullets(): void {
    const { paddle } = this;
    this.bullets = this.bullets.filter((b) => {
      b.x += b.dx * this.dt;
      b.y += b.dy * this.dt;
      if (b.x - b.radius < 0 || b.x + b.radius > this.canvasWidth) {
        b.dx = -b.dx;
        b.x = Math.max(b.radius, Math.min(b.x, this.canvasWidth - b.radius));
      }

      if (b.reflected) {
        if (this.checkReflectedBulletBrickHit(b.x, b.y, b.radius)) return false;
        return b.y > -20;
      }

      // Try automatic reflection on center hit
      if (this.tryReflectBullet(b)) {
        return true; // Keep bullet after reflection
      }

      if (
        circleRectCollision(b.x, b.y, b.radius, paddle.x, paddle.y, paddle.width, paddle.height)
      ) {
        this.applyDamage(b.x, b.y, b.damage, Math.min(b.damage * 2, 25), '#ff0000');
        return false;
      }
      return b.y < this.canvasHeight + 20 && b.x > -20 && b.x < this.canvasWidth + 20;
    });
  }

  private updateHomingBullets(): void {
    const { paddle } = this;
    this.homingBullets = this.homingBullets.filter((b) => {
      const targetX = paddle.x + paddle.width / 2;
      const targetY = paddle.y;
      const deltaY = targetY - b.y;

      if (deltaY < HOMING.lockDistance && !b.locked && !b.reflected) {
        b.locked = true;
        b.lockedX = targetX;
        b.lockedY = targetY;
        const accel = HOMING.lockedSpeed / b.speed;
        b.vx *= accel;
        b.vy *= accel;
        b.speed = HOMING.lockedSpeed;
        if (this.gameTime - this.lastHomingLockSE > 0.3) {
          this.audio.playSE('homingLock');
          this.lastHomingLockSE = this.gameTime;
        }
        this.showMascotComment('homingLock');
      }

      if (!b.locked) {
        // Tracking pip ~2 times/sec per bullet (probabilistic)
        if (Math.random() < 0.033) this.audio.playSE('homingPip');
        const deltaX = targetX - b.x;
        const distribution = Math.hypot(deltaX, deltaY);
        if (distribution > 0) {
          b.vx += (deltaX / distribution) * b.turnRate * this.dt;
          b.vy += (deltaY / distribution) * b.turnRate * this.dt;
          const mag = Math.hypot(b.vx, b.vy);
          if (mag > 0) {
            b.vx = (b.vx / mag) * b.speed;
            b.vy = (b.vy / mag) * b.speed;
          }
        }
      }

      b.x += b.vx * this.dt;
      b.y += b.vy * this.dt;

      if (b.reflected) {
        if (this.checkReflectedBulletBrickHit(b.x, b.y, b.radius)) {
          this.screenShake = 8; // homing causes more shake
          return false;
        }
        return b.y > -20;
      }

      // Try automatic reflection on center hit
      if (this.tryReflectHomingBullet(b)) {
        return true; // Keep bullet after reflection
      }

      if (
        circleRectCollision(b.x, b.y, b.radius, paddle.x, paddle.y, paddle.width, paddle.height)
      ) {
        this.applyDamage(b.x, b.y, b.damage, 30, '#ff00ff');
        return false;
      }
      return b.y < this.canvasHeight + 20 && b.x > -20 && b.x < this.canvasWidth + 20;
    });
  }

  private updateLasers(): void {
    const { paddle } = this;
    this.lasers = this.lasers.filter((laser) => {
      laser.timer -= this.dt;
      if (
        !laser.isWarning &&
        !laser.hit &&
        paddle.x < laser.x + laser.width &&
        paddle.x + paddle.width > laser.x
      ) {
        laser.hit = true;
        this.applyDamage(paddle.x + paddle.width / 2, paddle.y, DAMAGE.laser, 35, '#ffff00');
      }
      return laser.timer > 0;
    });
  }

  private updateHomingLasers(): void {
    const { paddle } = this;
    const targetX = paddle.x + paddle.width / 2 - HOMING_LASER.width / 2;

    this.homingLasers = this.homingLasers.filter((laser) => {
      laser.timer -= this.dt;

      switch (laser.phase) {
        case 'tracking': {
          // Follow player exactly (no delay)
          laser.x = targetX;
          // Clamp to screen bounds
          laser.x = Math.max(0, Math.min(laser.x, this.canvasWidth - laser.width));
          if (laser.timer <= 0) {
            laser.phase = 'locked';
            laser.timer = HOMING_LASER.lockedFrames;
            this.audio.playSE('hlCharge');
            this.showMascotComment('homingLaserLock');
          }
          break;
        }
        case 'locked': {
          // Warning phase - position fixed
          if (laser.timer <= 0) {
            laser.phase = 'firing';
            laser.timer = HOMING_LASER.fireFrames;
            this.audio.playSE('hlFire');
            this.screenShake = 15;
            // Spawn floating spark particles (visual effect only)
            this.spawnLaserSparks(laser.x + laser.width / 2);
          }
          break;
        }

        case 'firing': {
          // Damage check
          if (!laser.hit && paddle.x < laser.x + laser.width && paddle.x + paddle.width > laser.x) {
            laser.hit = true;
            this.applyDamage(
              paddle.x + paddle.width / 2,
              paddle.y,
              DAMAGE.homingLaser,
              40,
              '#00ffff',
            );
          }
          break;
        }
      }

      return laser.timer > 0;
    });
  }

  private updateParticles(): void {
    this.particles = this.particles.filter((p) => {
      p.x += p.dx * this.dt;
      p.y += p.dy * this.dt;
      p.life -= this.dt;
      return p.life > 0;
    });
  }

  private updateDeathAnimation(): void {
    this.deathTimer -= this.dt;
    for (const p of this.deathParticles) {
      p.x += p.dx * this.dt;
      p.y += p.dy * this.dt;
      p.dy += PHYSICS.gravity * this.dt;
      p.rotation += p.rotSpeed * this.dt;
      p.life -= this.dt;
    }
    this.deathParticles = this.deathParticles.filter((p) => p.life > 0);
    if (this.screenShake > 0) this.screenShake *= Math.pow(SHAKE.deathDecay, this.dt);
    if (this.deathTimer <= 0) {
      this._gameState = 'gameover';
      this.audio.stopBGM();
      this.audio.playSE('gameOver');
      this.options.onGameOver?.();
    }
  }

  private startDeathAnimation(): void {
    this._gameState = 'dying';
    this.deathTimer = PARTICLE.deathDuration;
    this.deathParticles = [];
    this.comboPopups = [];
    this.audio.playSE('death');
    this.showMascotComment('death');
    const [px, py] = [
      this.paddle.x + this.paddle.width / 2,
      this.paddle.y + this.paddle.height / 2,
    ];
    for (let index = 0; index < PARTICLE.death; index++) {
      const angle = (Math.PI * 2 * index) / PARTICLE.death + Math.random() * 0.3,
        speed = 2 + Math.random() * 4;
      this.deathParticles.push({
        x: px + (Math.random() - 0.5) * 30,
        y: py + (Math.random() - 0.5) * 10,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - 2,
        size: 4 + Math.random() * 6,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: PARTICLE.deathLife + Math.random() * 20,
        color: '#ffd700',
      });
    }
    this.screenShake = 30;
  }

  private spawnBullet(x: number, y: number, type: BulletSpawnType): void {
    this.audio.playSE(type === 'spread' ? 'spreadFire' : 'enemyFire');
    switch (type) {
      case 'spread': {
        for (let o = -2; o <= 2; o++)
          this.bullets.push({
            x,
            y,
            dx: o * 1.5,
            dy: 3 + Math.random() * 2,
            radius: 4,
            color: '#ff0000',
            damage: DAMAGE.spread,
          });

        break;
      }
      case 'homing': {
        this.homingBullets.push({
          x,
          y,
          vx: 0,
          vy: HOMING.initialSpeed,
          speed: HOMING.initialSpeed,
          radius: 6,
          color: '#ff00ff',
          turnRate: HOMING.turnRate,
          damage: DAMAGE.homing,
          locked: false,
        });

        break;
      }
      case 'rain': {
        for (let index = 0; index < 8; index++)
          this.bullets.push({
            x: Math.random() * this.canvasWidth,
            y: -10 - Math.random() * 50,
            dx: (Math.random() - 0.5) * 2,
            dy: 4 + Math.random() * 3,
            radius: 3,
            color: '#ff6600',
            damage: DAMAGE.rain,
          });

        break;
      }
      default: {
        this.bullets.push({
          x,
          y,
          dx: (Math.random() - 0.5) * 3,
          dy: 2 + Math.random() * 2,
          radius: 5,
          color: '#ff0000',
          damage: DAMAGE.normal,
        });
      }
    }
  }

  private spawnLaser(x: number): void {
    this.warning = 'LASER WARNING!';
    this.warningTimer = LASER.warningFrames;
    this.lasers.push({ x, width: LASER.width, timer: LASER.warningFrames, isWarning: true });
    this.audio.playSE('laserWarn');
    this.showMascotComment('laserWarning');
    const spawnSession = this.sessionId;
    setTimeout(() => {
      if (this.sessionId !== spawnSession || this._gameState !== 'playing') return;
      this.lasers = this.lasers.filter((l) => !(l.x === x && l.isWarning));
      this.lasers.push({ x, width: LASER.width, timer: LASER.fireFrames, isWarning: false });
      this.audio.playSE('laserFire');
      this.screenShake = 15;
    }, LASER.delayMs);
  }

  private spawnHomingLaser(): void {
    // Spawn at random x, starts tracking player
    const x = Math.random() * (this.canvasWidth - HOMING_LASER.width);
    this.homingLasers.push({
      x,
      width: HOMING_LASER.width,
      phase: 'tracking',
      timer: HOMING_LASER.trackingFrames,
    });
    this.audio.playSE('hlTrack');
    this.showMascotComment('homingLaserSpawn');
  }

  private spawnParticle(x: number, y: number, color: string): void {
    for (let index = 0; index < PARTICLE.normal; index++) {
      this.particles.push({
        x,
        y,
        dx: (Math.random() - 0.5) * 6,
        dy: (Math.random() - 0.5) * 6,
        life: PARTICLE.life,
        color,
      });
    }
  }

  private spawnLaserSparks(centerX: number): void {
    // Spawn floating spark particles along the laser beam
    const sparkCount = 8;
    const colors = ['#00ffff', '#00aaff', '#ffffff', '#88ffff'];
    for (let index = 0; index < sparkCount; index++) {
      const y = Math.random() * this.canvasHeight;
      this.particles.push({
        x: centerX + (Math.random() - 0.5) * 40,
        y,
        dx: (Math.random() - 0.5) * 0.8, // slow horizontal drift
        dy: (Math.random() - 0.5) * 0.5, // slow vertical drift (no gravity)
        life: 90 + Math.random() * 60, // ~1.5-2.5 sec
        color: colors[Math.floor(Math.random() * colors.length)] ?? '#00ffff',
      });
    }
  }

  private createRenderContext(): RenderContext {
    return {
      ctx: this.ctx,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      frameCount: this.frameCount,
      gameState: this._gameState,
      score: this._score,
      lives: this._lives,
      displayLives: this._displayLives,
      maxLives: this._maxLives,
      difficulty: this._difficulty,
      ball: this.ball,
      paddle: this.paddle,
      bricks: this.bricks,
      bullets: this.bullets,
      homingBullets: this.homingBullets,
      lasers: this.lasers,
      homingLasers: this.homingLasers,
      particles: this.particles,
      deathParticles: this.deathParticles,
      invincibleTimer: this.invincibleTimer,
      warning: this.warning,
      screenShake: this.screenShake,
      mascot: this.mascot,
      lang: this.lang,
      iconsLoaded: this.iconsLoaded,
      iconsLoadedCount: this.iconsLoadedCount,
      totalIconCount: MASCOT_FACE_PATHS.length,
      rewardImagesLoaded: this.rewardImagesLoaded,
      rewardImage: this.getRewardImageForScore(this._score),
      dangerLevel: this.calculateDangerLevel(),
      muted: this.audio.isMuted(),
      seVolume: this.audio.getSEVolume(),
      trackTitleText: this.trackTitleText,
      trackTitleTimer: this.trackTitleTimer,
      levelUpText: this.levelUpText,
      levelUpTimer: this.levelUpTimer,
      comboPopups: this.comboPopups,
    };
  }

  private draw(): void {
    render(this.createRenderContext());
  }
}
