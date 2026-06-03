/**
 * Runtime configuration loading and validation.
 *
 * Users tune the game by editing `config.js`, which sets `window.BREAKOUT_CONFIG`
 * before the bundle loads (see DESIGN.md). At boot we read that object, validate
 * its shape, fill in defaults for missing fields, and reject invalid values with a
 * console warning — no silent fallback for typed fields.
 */

import type { DifficultyLevel } from '../core/entities';
import type { Lang } from '../i18n/comments';

declare global {
  interface Window {
    BREAKOUT_CONFIG?: unknown;
  }
}

/** Score threshold → reward image. The highest matched threshold wins. */
export interface RewardThreshold {
  minScore: number;
  src: string;
}

export interface BreakoutConfig {
  /** Initial difficulty offered on the ready screen. */
  difficulty: DifficultyLevel;
  /** 0–100. Reserved: audio is a silent stub in this build, so volume has no effect yet. */
  bgmVolume: number;
  /** 0–100. Reserved: see bgmVolume. */
  seVolume: number;
  lang: Lang;
  showMascotComments: boolean;
  rewards: RewardThreshold[];
}

export const DEFAULT_CONFIG: BreakoutConfig = {
  difficulty: 'easy',
  bgmVolume: 80,
  seVolume: 90,
  lang: 'ja',
  showMascotComments: true,
  rewards: [
    { minScore: 0, src: 'assets/rewards/reward-001.webp' },
    { minScore: 3001, src: 'assets/rewards/reward-002.webp' },
    { minScore: 6001, src: 'assets/rewards/reward-003.webp' },
    { minScore: 9001, src: 'assets/rewards/reward-004.webp' },
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function warn(field: string): void {
  console.warn(`[breakout] config.${field} is invalid; using default`);
}

function asDifficulty(value: unknown): DifficultyLevel {
  if (value === undefined) return DEFAULT_CONFIG.difficulty;
  if (value === 'easy' || value === 'hard') return value;
  warn('difficulty');
  return DEFAULT_CONFIG.difficulty;
}

function asLang(value: unknown): Lang {
  if (value === undefined) return DEFAULT_CONFIG.lang;
  if (value === 'ja' || value === 'en') return value;
  warn('lang');
  return DEFAULT_CONFIG.lang;
}

function asVolume(value: unknown, field: string, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100) {
    return value;
  }
  warn(field);
  return fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  warn('showMascotComments');
  return fallback;
}

function cloneDefaultRewards(): RewardThreshold[] {
  return DEFAULT_CONFIG.rewards.map((reward) => ({ ...reward }));
}

function asRewards(value: unknown): RewardThreshold[] {
  if (value === undefined) return cloneDefaultRewards();
  if (!Array.isArray(value)) {
    warn('rewards');
    return cloneDefaultRewards();
  }
  const rewards: RewardThreshold[] = [];
  for (const entry of value) {
    if (isRecord(entry) && typeof entry.minScore === 'number' && typeof entry.src === 'string') {
      rewards.push({ minScore: entry.minScore, src: entry.src });
    } else {
      warn('rewards entry');
    }
  }
  if (rewards.length === 0) return cloneDefaultRewards();
  return rewards;
}

export function loadConfig(): BreakoutConfig {
  const raw = typeof window !== 'undefined' ? window.BREAKOUT_CONFIG : undefined;
  if (raw === undefined) return { ...DEFAULT_CONFIG, rewards: cloneDefaultRewards() };
  if (!isRecord(raw)) {
    console.warn('[breakout] BREAKOUT_CONFIG is not an object; using defaults');
    return { ...DEFAULT_CONFIG, rewards: cloneDefaultRewards() };
  }
  return {
    difficulty: asDifficulty(raw.difficulty),
    bgmVolume: asVolume(raw.bgmVolume, 'bgmVolume', DEFAULT_CONFIG.bgmVolume),
    seVolume: asVolume(raw.seVolume, 'seVolume', DEFAULT_CONFIG.seVolume),
    lang: asLang(raw.lang),
    showMascotComments: asBool(raw.showMascotComments, DEFAULT_CONFIG.showMascotComments),
    rewards: asRewards(raw.rewards),
  };
}
