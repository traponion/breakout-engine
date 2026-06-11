/**
 * Web Audio buffer SE backend — the http(s) path (dev server, Pages).
 *
 * Decoded `AudioBuffer`s played as one `AudioBufferSourceNode` per trigger:
 * near-zero per-play cost, free polyphony, cheap playbackRate pitch shifts,
 * and gain-based volume that works on iOS too. This is the pattern game-audio
 * libraries (howler.js, Phaser, PixiJS sound) default to for SFX. Fetching
 * the site's own assets is same-origin static-file serving, not a server
 * dependency (see DESIGN.md, Server-Zero). Under `file://`, where fetch is
 * blocked, the element backend is used instead.
 */

import { SE_NAMES } from './types';
import type { BreakoutSEType, SEBackend } from './types';

// Structural slices of the Web Audio API — the real AudioContext satisfies
// them, and tests can fake them without a DOM.
export interface GainLike {
  gain: { value: number };
  connect(destination: unknown): unknown;
}

export interface BufferSourceLike {
  buffer: AudioBuffer | null;
  playbackRate: { value: number };
  connect(destination: unknown): unknown;
  start(): void;
}

export interface AudioContextLike {
  readonly destination: unknown;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  createGain(): GainLike;
  createBufferSource(): BufferSourceLike;
}

export type FetchLike = (
  url: string,
) => Promise<{ ok: boolean; status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

export interface BufferBackendDeps {
  fetchFn: FetchLike;
  createContext: () => AudioContextLike;
}

/** Real-browser deps; null where fetch / Web Audio don't exist (unit tests). */
function defaultDeps(): BufferBackendDeps | null {
  if (typeof fetch === 'undefined' || typeof AudioContext === 'undefined') return null;
  return {
    fetchFn: (url) => fetch(url),
    createContext: () => new AudioContext(),
  };
}

export class BufferSEBackend implements SEBackend {
  private ctx: AudioContextLike | null = null;
  private gain: GainLike | null = null;
  private readonly buffers = new Map<BreakoutSEType, AudioBuffer>();
  private fetches = new Map<BreakoutSEType, Promise<ArrayBuffer>>();
  private readonly processed = new Set<BreakoutSEType>();
  private readonly deps: BufferBackendDeps | null;
  private unlocked = false;

  constructor(paths: Readonly<Record<BreakoutSEType, string>>, deps?: BufferBackendDeps) {
    this.deps = deps ?? defaultDeps();
    if (!this.deps) return; // unsupported environment — backend stays silent

    // Start fetching immediately so decoding can begin the moment unlock()
    // provides an AudioContext.
    for (const name of SE_NAMES) {
      const fetched = this.deps
        .fetchFn(paths[name])
        .then((res) =>
          res.ok ? res.arrayBuffer() : Promise.reject(new Error(`HTTP ${String(res.status)}`)),
        );
      // decodeAll() consumes the rejection later; this guard keeps an early
      // fetch failure from surfacing as an unhandled rejection meanwhile.
      fetched.catch(() => undefined);
      this.fetches.set(name, fetched);
    }
  }

  /**
   * Create/resume the AudioContext. One context unlocks the whole page —
   * no per-element ceremony. resume() is retried on every qualifying
   * gesture because iOS can re-suspend a context.
   */
  unlock(): void {
    this.unlocked = true;
    if (!this.deps) return;
    if (!this.ctx) {
      try {
        this.ctx = this.deps.createContext();
      } catch {
        return; // context creation failed — stay silent
      }
      const gain = this.ctx.createGain();
      gain.connect(this.ctx.destination);
      this.gain = gain;
      this.decodeAll();
    }
    this.ctx.resume().catch(() => {
      // resume rejected — the next gesture retries
    });
  }

  private decodeAll(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const [name, fetched] of this.fetches) {
      fetched
        .then((data) => ctx.decodeAudioData(data))
        .then((buffer) => {
          this.buffers.set(name, buffer);
          this.processed.add(name);
        })
        .catch((err: unknown) => {
          console.warn(`[breakout] failed to load sound: ${name}`, err);
          this.processed.add(name);
        });
    }
    this.fetches.clear();
  }

  /** True once every SE finished processing (decoded or failed). */
  isReady(): boolean {
    if (!this.deps) return this.unlocked;
    return this.ctx !== null && this.processed.size >= SE_NAMES.length;
  }

  play(name: BreakoutSEType, rate: number, volume: number): void {
    if (!this.ctx || !this.gain) return;
    const buffer = this.buffers.get(name);
    if (!buffer) return;
    this.gain.gain.value = volume;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(this.gain);
    src.start();
  }
}
