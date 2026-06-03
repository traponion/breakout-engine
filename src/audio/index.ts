/**
 * Audio manager — silent stub.
 *
 * This build ships without sound. The class satisfies the API the core engine
 * depends on (so the game logic is unchanged), but every playback method is a
 * no-op. `isReady()` returns true once `unlock()` has run, because the engine
 * gates game start on it. Real synthesis (Web Audio / MML) is a later phase.
 *
 * Server-zero note: a real implementation must not introduce `fetch` or any
 * network access — synthesize at runtime instead.
 */

import type { DifficultyLevel } from '../core/entities';

export type BreakoutSEType =
  | 'paddleHit'
  | 'powerShot'
  | 'blockHit'
  | 'blockBreak'
  | 'blockBreakMax'
  | 'damageLight'
  | 'damageMid'
  | 'damageHeavy'
  | 'death'
  | 'gameOver'
  | 'enemyFire'
  | 'spreadFire'
  | 'reflect'
  | 'laserWarn'
  | 'laserFire'
  | 'homingPip'
  | 'homingLock'
  | 'wallBounce'
  | 'rain'
  | 'diffUp'
  | 'newRow'
  | 'hlTrack'
  | 'hlCharge'
  | 'hlFire';

export class BreakoutAudioManager {
  private unlocked = false;
  private muted = false;

  /** Mark audio as unlocked. Must be called from a user gesture in a real build. */
  unlock(): void {
    this.unlocked = true;
  }

  /** Gates game start. True once unlocked; no decoding to wait on in the stub. */
  isReady(): boolean {
    return this.unlocked;
  }

  playSE(type: BreakoutSEType, playbackRate = 1): void {
    void type;
    void playbackRate;
  }

  playBGM(difficultyLevel?: DifficultyLevel): string | null {
    void difficultyLevel;
    return null;
  }

  stopBGM(): void {
    // No-op: nothing is playing.
  }

  isMuted(): boolean {
    return this.muted;
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }
}
