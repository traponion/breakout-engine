import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakoutAudioManager, SE_NAMES, SE_POOL_SIZE, defaultSEPath } from './index';
import type { AudioManagerOptions, PooledAudio } from './index';

class FakeAudio implements PooledAudio {
  volume = 1;
  muted = false;
  currentTime = 0;
  playbackRate = 1;
  playCount = 0;
  paused = true;

  constructor(public src: string) {}

  play(): Promise<void> {
    this.playCount++;
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }
}

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => {
      map.clear();
    },
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

function createManager(options: Omit<AudioManagerOptions, 'createAudio'> = {}): {
  manager: BreakoutAudioManager;
  created: FakeAudio[];
} {
  const created: FakeAudio[] = [];
  const manager = new BreakoutAudioManager({
    ...options,
    createAudio: (src) => {
      const el = new FakeAudio(src);
      created.push(el);
      return el;
    },
  });
  return { manager, created };
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BreakoutAudioManager pools', () => {
  it('creates a fixed-size pool per SE using the conventional paths', () => {
    const { created } = createManager();
    expect(created).toHaveLength(SE_NAMES.length * SE_POOL_SIZE);
    const paddleHit = created.filter((el) => el.src === defaultSEPath('paddleHit'));
    expect(paddleHit).toHaveLength(SE_POOL_SIZE);
  });

  it('honours per-SE path overrides without touching other SE', () => {
    const { created } = createManager({ sounds: { paddleHit: 'custom/hit.mp3' } });
    expect(created.filter((el) => el.src === 'custom/hit.mp3')).toHaveLength(SE_POOL_SIZE);
    expect(created.filter((el) => el.src === defaultSEPath('blockBreak'))).toHaveLength(
      SE_POOL_SIZE,
    );
  });
});

describe('unlock', () => {
  it('does not play anything before unlock', () => {
    const { manager, created } = createManager();
    manager.playSE('paddleHit');
    expect(created.every((el) => el.playCount === 0)).toBe(true);
    expect(manager.isReady()).toBe(false);
  });

  it('warms every element muted, then pauses and rewinds it', async () => {
    const { manager, created } = createManager();
    manager.unlock();
    expect(manager.isReady()).toBe(true);
    expect(created.every((el) => el.muted && el.playCount === 1)).toBe(true);
    await flushMicrotasks();
    expect(created.every((el) => el.paused && el.currentTime === 0)).toBe(true);
  });

  it('is idempotent', () => {
    const { manager, created } = createManager();
    manager.unlock();
    manager.unlock();
    expect(created.every((el) => el.playCount === 1)).toBe(true);
  });
});

describe('playSE', () => {
  it('rotates the pool and applies volume, rate, and unmute', () => {
    const { manager, created } = createManager({ seVolume: 80 });
    manager.unlock();
    const pool = created.filter((el) => el.src === defaultSEPath('blockHit'));

    for (let i = 0; i < SE_POOL_SIZE + 1; i++) {
      manager.playSE('blockHit', 1.2);
    }

    // Warm-up contributes one play to every element; the wrap-around adds one more
    const playCounts = pool.map((el) => el.playCount - 1);
    expect(playCounts).toEqual(pool.map((_, i) => (i === 0 ? 2 : 1)));
    expect(pool.every((el) => !el.muted)).toBe(true);
    expect(pool[0]?.volume).toBeCloseTo(0.8);
    expect(pool[0]?.playbackRate).toBe(1.2);
  });

  it('skips playback while muted or at zero volume', () => {
    const { manager, created } = createManager();
    manager.unlock();
    const pool = created.filter((el) => el.src === defaultSEPath('paddleHit'));

    manager.setMuted(true);
    manager.playSE('paddleHit');
    manager.setMuted(false);
    manager.setSEVolume(0);
    manager.playSE('paddleHit');

    expect(pool.every((el) => el.playCount === 1)).toBe(true); // warm-up only
  });
});

describe('volume and mute persistence', () => {
  it('clamps and rounds the SE volume', () => {
    const { manager } = createManager();
    manager.setSEVolume(150);
    expect(manager.getSEVolume()).toBe(100);
    manager.setSEVolume(-5);
    expect(manager.getSEVolume()).toBe(0);
    manager.setSEVolume(33.4);
    expect(manager.getSEVolume()).toBe(33);
  });

  it('persists volume and mute, and a stored value wins over the config default', () => {
    const { manager } = createManager({ seVolume: 90 });
    manager.setSEVolume(25);
    manager.toggleMute();

    const { manager: reloaded } = createManager({ seVolume: 90 });
    expect(reloaded.getSEVolume()).toBe(25);
    expect(reloaded.isMuted()).toBe(true);
  });

  it('uses the config default when nothing is stored', () => {
    const { manager } = createManager({ seVolume: 70 });
    expect(manager.getSEVolume()).toBe(70);
    expect(manager.isMuted()).toBe(false);
  });
});

describe('non-DOM environments', () => {
  it('constructs silently without an Audio constructor and never throws', () => {
    const manager = new BreakoutAudioManager({ seVolume: 50 });
    manager.unlock();
    manager.playSE('paddleHit');
    expect(manager.isReady()).toBe(true);
    expect(manager.getSEVolume()).toBe(50);
  });
});
