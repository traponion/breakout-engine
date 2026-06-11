/**
 * Element-pool SE backend — the `file://` path.
 *
 * Media elements load local relative paths the same way `<img>` does, which
 * is the only way to read the replaceable files in `assets/sounds/` where
 * `fetch` is blocked (opaque origin). Each SE owns a small pool of elements
 * rotated per play so rapid repeats overlap instead of cutting each other
 * off. Over http(s) the buffer backend is used instead (see DESIGN.md).
 */

import { SE_NAMES } from './types';
import type { BreakoutSEType, SEBackend } from './types';

/**
 * The slice of HTMLAudioElement this backend drives. Production uses real
 * audio elements via the default factory; tests inject fakes so the backend
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

// Elements per SE: enough for audible overlap on the fastest repeats
// (paddle spam, multi-brick combos) without piling up media elements.
export const SE_POOL_SIZE = 4;

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

export class ElementSEBackend implements SEBackend {
  private readonly pools = new Map<BreakoutSEType, SEPool>();
  private readonly warmed = new Set<PooledAudio>();
  private readonly warming = new Set<PooledAudio>();
  private totalElements = 0;
  private unlocked = false;

  constructor(
    paths: Readonly<Record<BreakoutSEType, string>>,
    createAudio?: (src: string) => PooledAudio,
  ) {
    const factory = createAudio ?? defaultAudioFactory();
    if (!factory) return; // non-DOM environment — backend stays silent

    for (const name of SE_NAMES) {
      const elements: PooledAudio[] = [];
      for (let i = 0; i < SE_POOL_SIZE; i++) {
        elements.push(factory(paths[name]));
      }
      this.pools.set(name, { elements, next: 0 });
      this.totalElements += elements.length;
    }
  }

  /**
   * Warm every pooled element up with an unmuted, volume-0 play/pause.
   * WebKit grants audible playback per element, and only for an *unmuted*
   * play() started inside a completed gesture (touchend/click — touchstart
   * does not count), so a muted warm-up would grant nothing. Volume 0 keeps
   * the warm-up silent where volume is honoured; iOS ignores volume, where
   * the immediate pause covers it. Elements rejected by an invalid-context
   * attempt are retried on the next call.
   */
  unlock(): void {
    this.unlocked = true;
    if (this.warmed.size >= this.totalElements) return;
    for (const pool of this.pools.values()) {
      for (const el of pool.elements) {
        if (this.warmed.has(el) || this.warming.has(el)) continue;
        this.warming.add(el);
        el.muted = false;
        el.volume = 0;
        el.play()
          .then(() => {
            this.warmed.add(el);
            // play() may have claimed this element meanwhile — don't pause it
            if (this.warming.delete(el)) {
              el.pause();
              el.currentTime = 0;
            }
          })
          .catch(() => {
            this.warming.delete(el); // not a valid activation — retry later
          });
      }
    }
  }

  /** Elements stream from disk on demand; the gesture is the only gate. */
  isReady(): boolean {
    return this.unlocked;
  }

  play(name: BreakoutSEType, rate: number, volume: number): void {
    if (!this.unlocked) return;
    const pool = this.pools.get(name);
    if (!pool) return;
    const el = pool.elements[pool.next];
    pool.next = (pool.next + 1) % pool.elements.length;
    if (!el) return;
    this.warming.delete(el); // claim: a pending warm-up must not pause this play
    el.muted = false;
    el.volume = volume;
    el.playbackRate = rate;
    el.currentTime = 0;
    el.play().catch(() => {
      // Playback rejected (missing file, codec, policy) — skip this SE
    });
  }
}
