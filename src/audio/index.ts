/**
 * Audio manager — sound-effect playback via pooled audio elements.
 *
 * SE are replaceable files under `assets/sounds/` (see DESIGN.md). Media
 * elements load local relative paths under both `file://` and http(s) — the
 * same mechanism `<img>` relies on — so playback needs no `fetch` and the
 * server-zero rule stays literal. Each SE owns a small pool of elements
 * rotated per play, so rapid repeats overlap instead of cutting each other
 * off.
 *
 * BGM methods are stubs: background music ships in a follow-up as
 * `assets/sounds/bgm-*.mp3` through this same element mechanism.
 */

import type { DifficultyLevel } from '../core/entities';

export const SE_NAMES = [
  'paddleHit',
  'powerShot',
  'blockHit',
  'blockBreak',
  'blockBreakMax',
  'damageLight',
  'damageMid',
  'damageHeavy',
  'death',
  'gameOver',
  'enemyFire',
  'spreadFire',
  'reflect',
  'laserWarn',
  'laserFire',
  'homingPip',
  'homingLock',
  'wallBounce',
  'rain',
  'diffUp',
  'newRow',
  'hlTrack',
  'hlCharge',
  'hlFire',
] as const;

export type BreakoutSEType = (typeof SE_NAMES)[number];

/** Conventional path of a bundled SE file (see DESIGN.md asset conventions). */
export function defaultSEPath(name: BreakoutSEType): string {
  return `assets/sounds/se-${name}.mp3`;
}

/**
 * The slice of HTMLAudioElement the manager drives. Production uses real
 * audio elements via the default factory; tests inject fakes so the manager
 * stays testable without a DOM.
 */
export interface PooledAudio {
  volume: number;
  muted: boolean;
  currentTime: number;
  playbackRate: number;
  play(): Promise<void>;
  pause(): void;
}

export interface AudioManagerOptions {
  /** Initial SE volume (0–100) from config; a stored user setting wins. */
  seVolume?: number;
  /** Per-SE file paths; missing entries fall back to the convention. */
  sounds?: Partial<Record<BreakoutSEType, string>>;
  /** Element factory override for tests / non-DOM environments. */
  createAudio?: (src: string) => PooledAudio;
}

// Elements per SE: enough for audible overlap on the fastest repeats
// (paddle spam, multi-brick combos) without piling up media elements.
export const SE_POOL_SIZE = 4;

const STORAGE_KEY_SE = 'breakout-se-volume';
const STORAGE_KEY_MUTE = 'breakout-muted';
// Mirrors DEFAULT_CONFIG.seVolume; only used when no config value is passed.
const DEFAULT_SE_VOLUME = 90;

function clampVolume(level: number): number {
  return Math.max(0, Math.min(100, Math.round(level)));
}

function loadStoredInt(key: string): number | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      const n = Number.parseInt(value, 10);
      if (!Number.isNaN(n)) return n;
    }
  } catch {
    // localStorage unavailable (blocked or non-DOM) — fall through
  }
  return null;
}

function loadStoredBool(key: string): boolean | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) return value === 'true';
  } catch {
    // localStorage unavailable — fall through
  }
  return null;
}

function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — the setting just won't persist
  }
}

/** Real-element factory; null where media elements don't exist (unit tests). */
function defaultAudioFactory(): ((src: string) => PooledAudio) | null {
  if (typeof Audio === 'undefined') return null;
  return (src: string): PooledAudio => {
    const el = new Audio(src);
    el.preload = 'auto';
    // Match the original sound design: playbackRate shifts pitch (HP/combo
    // pitch variations), like an AudioBufferSourceNode would.
    el.preservesPitch = false;
    el.addEventListener(
      'error',
      () => {
        console.warn(`[breakout] failed to load sound: ${src}`);
      },
      { once: true },
    );
    return el;
  };
}

interface SEPool {
  elements: PooledAudio[];
  next: number;
}

export class BreakoutAudioManager {
  private readonly pools = new Map<BreakoutSEType, SEPool>();
  private seVolume: number;
  private muted: boolean;
  private unlocked = false;

  constructor(options: AudioManagerOptions = {}) {
    this.seVolume = clampVolume(
      loadStoredInt(STORAGE_KEY_SE) ?? options.seVolume ?? DEFAULT_SE_VOLUME,
    );
    this.muted = loadStoredBool(STORAGE_KEY_MUTE) ?? false;

    const createAudio = options.createAudio ?? defaultAudioFactory();
    if (!createAudio) return; // non-DOM environment — manager stays silent

    for (const name of SE_NAMES) {
      const src = options.sounds?.[name] ?? defaultSEPath(name);
      const elements: PooledAudio[] = [];
      for (let i = 0; i < SE_POOL_SIZE; i++) {
        elements.push(createAudio(src));
      }
      this.pools.set(name, { elements, next: 0 });
    }
  }

  /**
   * Unlock playback. Must be called from a user gesture handler. On iOS an
   * element may only play after it has started once inside a gesture, so
   * every pooled element gets a muted play/pause warm-up. Idempotent.
   */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    for (const pool of this.pools.values()) {
      for (const el of pool.elements) {
        el.muted = true;
        el.play()
          .then(() => {
            el.pause();
            el.currentTime = 0;
          })
          .catch(() => {
            // Autoplay rejected or file missing — playSE retries per play
          });
      }
    }
  }

  /** Gates game start. Elements stream on demand, so the gesture is the only gate. */
  isReady(): boolean {
    return this.unlocked;
  }

  playSE(type: BreakoutSEType, playbackRate = 1): void {
    if (!this.unlocked || this.muted || this.seVolume === 0) return;
    const pool = this.pools.get(type);
    if (!pool) return;
    const el = pool.elements[pool.next];
    pool.next = (pool.next + 1) % pool.elements.length;
    if (!el) return;
    el.muted = false;
    el.volume = this.seVolume / 100;
    el.playbackRate = playbackRate;
    el.currentTime = 0;
    el.play().catch(() => {
      // Playback rejected (missing file, codec, policy) — skip this SE
    });
  }

  playBGM(difficultyLevel?: DifficultyLevel): string | null {
    void difficultyLevel;
    return null; // BGM ships in a follow-up issue
  }

  stopBGM(): void {
    // No-op: nothing is playing.
  }

  getSEVolume(): number {
    return this.seVolume;
  }

  setSEVolume(level: number): void {
    this.seVolume = clampVolume(level);
    store(STORAGE_KEY_SE, String(this.seVolume));
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    store(STORAGE_KEY_MUTE, String(muted));
  }

  toggleMute(): void {
    this.setMuted(!this.muted);
  }
}
