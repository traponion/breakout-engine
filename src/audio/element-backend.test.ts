import { describe, expect, it } from 'vitest';
import { ElementSEBackend, SE_POOL_SIZE } from './element-backend';
import type { PooledAudio } from './element-backend';
import { SE_NAMES, defaultSEPath } from './types';
import type { BreakoutSEType } from './types';

class FakeAudio implements PooledAudio {
  volume = 1;
  muted = false;
  currentTime = 0;
  playbackRate = 1;
  playCount = 0;
  paused = true;
  rejectPlay = false;

  constructor(public src: string) {}

  play(): Promise<void> {
    this.playCount++;
    if (this.rejectPlay) return Promise.reject(new Error('not allowed'));
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

function conventionalPaths(): Record<BreakoutSEType, string> {
  const paths: Partial<Record<BreakoutSEType, string>> = {};
  for (const name of SE_NAMES) paths[name] = defaultSEPath(name);
  return paths as Record<BreakoutSEType, string>;
}

function createBackend(): { backend: ElementSEBackend; created: FakeAudio[] } {
  const created: FakeAudio[] = [];
  const backend = new ElementSEBackend(conventionalPaths(), (src) => {
    const el = new FakeAudio(src);
    created.push(el);
    return el;
  });
  return { backend, created };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe('pools', () => {
  it('creates a fixed-size pool per SE using the given paths', () => {
    const { created } = createBackend();
    expect(created).toHaveLength(SE_NAMES.length * SE_POOL_SIZE);
    const paddleHit = created.filter((el) => el.src === defaultSEPath('paddleHit'));
    expect(paddleHit).toHaveLength(SE_POOL_SIZE);
  });
});

describe('unlock and warm-up', () => {
  it('plays nothing before unlock', () => {
    const { backend, created } = createBackend();
    backend.play('paddleHit', 1, 0.9);
    expect(created.every((el) => el.playCount === 0)).toBe(true);
    expect(backend.isReady()).toBe(false);
  });

  it('warms every element unmuted at volume 0, then pauses and rewinds it', async () => {
    const { backend, created } = createBackend();
    backend.unlock();
    expect(backend.isReady()).toBe(true);
    expect(created.every((el) => !el.muted && el.volume === 0 && el.playCount === 1)).toBe(true);
    await flushMicrotasks();
    expect(created.every((el) => el.paused && el.currentTime === 0)).toBe(true);
  });

  it('does not double-warm elements while a warm-up is in flight', () => {
    const { backend, created } = createBackend();
    backend.unlock();
    backend.unlock();
    expect(created.every((el) => el.playCount === 1)).toBe(true);
  });

  it('retries elements whose warm-up was rejected (invalid activation context)', async () => {
    const { backend, created } = createBackend();
    for (const el of created) el.rejectPlay = true;
    backend.unlock(); // e.g. driven from touchstart — rejected
    await flushMicrotasks();
    for (const el of created) el.rejectPlay = false;
    backend.unlock(); // e.g. the following touchend — succeeds
    expect(created.every((el) => el.playCount === 2)).toBe(true);
    await flushMicrotasks();
    expect(created.every((el) => el.paused && el.currentTime === 0)).toBe(true);
  });

  it('never pauses an SE that claimed an element while its warm-up was pending', async () => {
    const { backend, created } = createBackend();
    backend.unlock();
    backend.play('paddleHit', 1, 0.9); // same gesture as unlock — claims element 0
    const pool = created.filter((el) => el.src === defaultSEPath('paddleHit'));
    await flushMicrotasks();
    expect(pool[0]?.paused).toBe(false);
    expect(pool.slice(1).every((el) => el.paused)).toBe(true);
  });
});

describe('play', () => {
  it('rotates the pool and applies volume, rate, and unmute', () => {
    const { backend, created } = createBackend();
    backend.unlock();
    const pool = created.filter((el) => el.src === defaultSEPath('blockHit'));

    for (let i = 0; i < SE_POOL_SIZE + 1; i++) {
      backend.play('blockHit', 1.2, 0.8);
    }

    // Warm-up contributes one play to every element; the wrap-around adds one more
    const playCounts = pool.map((el) => el.playCount - 1);
    expect(playCounts).toEqual(pool.map((_, i) => (i === 0 ? 2 : 1)));
    expect(pool.every((el) => !el.muted)).toBe(true);
    expect(pool[0]?.volume).toBeCloseTo(0.8);
    expect(pool[0]?.playbackRate).toBe(1.2);
  });
});

describe('non-DOM environments', () => {
  it('constructs silently without an Audio constructor and never throws', () => {
    const backend = new ElementSEBackend(conventionalPaths());
    backend.unlock();
    backend.play('paddleHit', 1, 0.9);
    expect(backend.isReady()).toBe(true);
  });
});
