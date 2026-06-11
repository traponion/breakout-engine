import { afterEach, describe, expect, it, vi } from 'vitest';
import { BufferSEBackend } from './buffer-backend';
import type { AudioContextLike, FetchLike } from './buffer-backend';
import { SE_NAMES, defaultSEPath } from './types';
import type { BreakoutSEType } from './types';

class FakeGain {
  gain = { value: 1 };
  connected: unknown = null;

  connect(destination: unknown): unknown {
    this.connected = destination;
    return destination;
  }
}

class FakeSource {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  connected: unknown = null;
  started = 0;

  connect(destination: unknown): unknown {
    this.connected = destination;
    return destination;
  }

  start(): void {
    this.started++;
  }
}

class FakeContext implements AudioContextLike {
  destination: unknown = { node: 'destination' };
  resumeCount = 0;
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  failDecode = false;

  resume(): Promise<void> {
    this.resumeCount++;
    return Promise.resolve();
  }

  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer> {
    void data;
    if (this.failDecode) return Promise.reject(new Error('bad data'));
    return Promise.resolve({ duration: 0.1 } as unknown as AudioBuffer);
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createBufferSource(): FakeSource {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
}

function conventionalPaths(): Record<BreakoutSEType, string> {
  const paths: Partial<Record<BreakoutSEType, string>> = {};
  for (const name of SE_NAMES) paths[name] = defaultSEPath(name);
  return paths as Record<BreakoutSEType, string>;
}

function createBackend(notFound: ReadonlySet<string> = new Set()): {
  backend: BufferSEBackend;
  ctx: FakeContext;
  fetchedUrls: string[];
} {
  const ctx = new FakeContext();
  const fetchedUrls: string[] = [];
  const fetchFn: FetchLike = (url) => {
    fetchedUrls.push(url);
    return Promise.resolve({
      ok: !notFound.has(url),
      status: notFound.has(url) ? 404 : 200,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4)),
    });
  };
  const backend = new BufferSEBackend(conventionalPaths(), {
    fetchFn,
    createContext: () => ctx,
  });
  return { backend, ctx, fetchedUrls };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prefetch and unlock', () => {
  it('fetches every SE path immediately at construction', () => {
    const { fetchedUrls } = createBackend();
    expect(fetchedUrls).toHaveLength(SE_NAMES.length);
    expect(fetchedUrls).toContain(defaultSEPath('paddleHit'));
  });

  it('is not ready and plays nothing before unlock', () => {
    const { backend, ctx } = createBackend();
    expect(backend.isReady()).toBe(false);
    backend.play('paddleHit', 1, 0.9);
    expect(ctx.sources).toHaveLength(0);
  });

  it('creates one context, wires the gain, decodes, and becomes ready', async () => {
    const { backend, ctx } = createBackend();
    backend.unlock();
    expect(ctx.resumeCount).toBe(1);
    expect(ctx.gains).toHaveLength(1);
    expect(ctx.gains[0]?.connected).toBe(ctx.destination);
    await flushMicrotasks();
    expect(backend.isReady()).toBe(true);
  });

  it('keeps a single context but resumes again on later unlocks', () => {
    const { backend, ctx } = createBackend();
    backend.unlock();
    backend.unlock();
    expect(ctx.gains).toHaveLength(1);
    expect(ctx.resumeCount).toBe(2);
  });
});

describe('play', () => {
  it('plays a decoded buffer with rate and volume applied', async () => {
    const { backend, ctx } = createBackend();
    backend.unlock();
    await flushMicrotasks();

    backend.play('blockHit', 1.2, 0.8);

    expect(ctx.sources).toHaveLength(1);
    const source = ctx.sources[0];
    expect(source?.buffer).not.toBeNull();
    expect(source?.playbackRate.value).toBe(1.2);
    expect(source?.connected).toBe(ctx.gains[0]);
    expect(source?.started).toBe(1);
    expect(ctx.gains[0]?.gain.value).toBeCloseTo(0.8);
  });

  it('overlapping plays each get their own source node', async () => {
    const { backend, ctx } = createBackend();
    backend.unlock();
    await flushMicrotasks();
    backend.play('paddleHit', 1, 0.9);
    backend.play('paddleHit', 1, 0.9);
    backend.play('paddleHit', 1, 0.9);
    expect(ctx.sources).toHaveLength(3);
  });
});

describe('failure tolerance', () => {
  it('a missing file warns, still counts as processed, and skips that SE only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { backend, ctx } = createBackend(new Set([defaultSEPath('paddleHit')]));
    backend.unlock();
    await flushMicrotasks();

    expect(backend.isReady()).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);

    backend.play('paddleHit', 1, 0.9);
    expect(ctx.sources).toHaveLength(0);
    backend.play('blockHit', 1, 0.9);
    expect(ctx.sources).toHaveLength(1);
  });

  it('decode failures warn and still count as processed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { backend, ctx } = createBackend();
    ctx.failDecode = true;
    backend.unlock();
    await flushMicrotasks();
    expect(backend.isReady()).toBe(true);
    expect(warn).toHaveBeenCalledTimes(SE_NAMES.length);
  });
});

describe('unsupported environments', () => {
  it('constructs silently without fetch/AudioContext and never throws', () => {
    const backend = new BufferSEBackend(conventionalPaths());
    expect(backend.isReady()).toBe(false);
    backend.unlock();
    backend.play('paddleHit', 1, 0.9);
    expect(backend.isReady()).toBe(true); // gate falls back to the unlock flag
  });
});
