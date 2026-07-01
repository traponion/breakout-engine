/**
 * Audio manager — SE volume/mute state plus a playback backend.
 *
 * SE are replaceable files under `assets/sounds/` (see DESIGN.md). The
 * backend is picked at boot by URL scheme: Web Audio buffers over http(s)
 * (low latency, smooth on iOS), element pools under `file://` (media
 * elements load local paths where fetch is blocked). Both follow the same
 * config/asset contract, so replace-in-place works identically everywhere.
 */

import { BufferSEBackend } from './buffer-backend';
import { ElementSEBackend } from './element-backend';
import { SE_NAMES, defaultSEPath } from './types';
import type { BreakoutSEType, SEBackend } from './types';

export { SE_NAMES, defaultSEPath } from './types';
export type { BreakoutSEType, SEBackend } from './types';

/** Backend choice by URL scheme: fetch+decode needs http(s); file:// gets elements. */
export function selectBackendKind(protocol: string | null): 'buffer' | 'element' {
  return protocol === 'http:' || protocol === 'https:' ? 'buffer' : 'element';
}

function resolvePaths(
  sounds?: Partial<Record<BreakoutSEType, string>>,
): Record<BreakoutSEType, string> {
  const paths: Partial<Record<BreakoutSEType, string>> = {};
  for (const name of SE_NAMES) paths[name] = sounds?.[name] ?? defaultSEPath(name);
  return paths as Record<BreakoutSEType, string>;
}

function createDefaultBackend(paths: Record<BreakoutSEType, string>): SEBackend {
  const protocol = typeof location !== 'undefined' ? location.protocol : null;
  if (
    selectBackendKind(protocol) === 'buffer' &&
    typeof fetch !== 'undefined' &&
    typeof AudioContext !== 'undefined'
  ) {
    return new BufferSEBackend(paths);
  }
  return new ElementSEBackend(paths);
}

export interface AudioManagerOptions {
  /** Initial SE volume (0–100) from config; a stored user setting wins. */
  seVolume?: number;
  /** Per-SE file paths; missing entries fall back to the convention. */
  sounds?: Partial<Record<BreakoutSEType, string>>;
  /** Backend override for tests. */
  backend?: SEBackend;
}

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

export class BreakoutAudioManager {
  private readonly backend: SEBackend;
  private seVolume: number;
  private muted: boolean;

  constructor(options: AudioManagerOptions = {}) {
    this.seVolume = clampVolume(
      loadStoredInt(STORAGE_KEY_SE) ?? options.seVolume ?? DEFAULT_SE_VOLUME,
    );
    this.muted = loadStoredBool(STORAGE_KEY_MUTE) ?? false;
    this.backend = options.backend ?? createDefaultBackend(resolvePaths(options.sounds));
  }

  /** Forwarded to the backend; call from user-gesture handlers. Retry-safe. */
  unlock(): void {
    this.backend.unlock();
  }

  /** Gates game start. */
  isReady(): boolean {
    return this.backend.isReady();
  }

  playSE(type: BreakoutSEType, playbackRate = 1): void {
    if (this.muted || this.seVolume === 0) return;
    this.backend.play(type, playbackRate, this.seVolume / 100);
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
