/**
 * Shared SE names and the backend contract.
 *
 * The manager (`index.ts`) picks one backend at boot by URL scheme: Web Audio
 * buffers over http(s), element pools under `file://` (see DESIGN.md).
 */

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

/** What a playback backend owes the manager. */
export interface SEBackend {
  /**
   * Prepare playback. Called from user-gesture handlers (click / touchend /
   * mouseup — events WebKit counts as activation). Idempotent and retry-safe:
   * the game calls it on every qualifying gesture until everything is warm.
   */
  unlock(): void;
  /** Gates game start: true once the backend can be expected to produce sound. */
  isReady(): boolean;
  /** Play one SE instance. `volume` is 0–1; `rate` maps to playbackRate. */
  play(name: BreakoutSEType, rate: number, volume: number): void;
}
