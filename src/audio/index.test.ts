import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreakoutAudioManager, selectBackendKind } from './index';
import type { BreakoutSEType, SEBackend } from './index';

class MockBackend implements SEBackend {
  unlockCount = 0;
  ready = false;
  plays: { name: BreakoutSEType; rate: number; volume: number }[] = [];

  unlock(): void {
    this.unlockCount++;
    this.ready = true;
  }

  isReady(): boolean {
    return this.ready;
  }

  play(name: BreakoutSEType, rate: number, volume: number): void {
    this.plays.push({ name, rate, volume });
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

function createManager(seVolume?: number): { manager: BreakoutAudioManager; backend: MockBackend } {
  const backend = new MockBackend();
  const manager = new BreakoutAudioManager({ seVolume, backend });
  return { manager, backend };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('selectBackendKind', () => {
  it('picks buffers over http(s) and elements everywhere else', () => {
    expect(selectBackendKind('http:')).toBe('buffer');
    expect(selectBackendKind('https:')).toBe('buffer');
    expect(selectBackendKind('file:')).toBe('element');
    expect(selectBackendKind(null)).toBe('element');
  });
});

describe('backend delegation', () => {
  it('forwards unlock and isReady', () => {
    const { manager, backend } = createManager();
    expect(manager.isReady()).toBe(false);
    manager.unlock();
    expect(backend.unlockCount).toBe(1);
    expect(manager.isReady()).toBe(true);
  });

  it('passes the rate and the volume scaled to 0–1', () => {
    const { manager, backend } = createManager(80);
    manager.playSE('blockHit', 1.2);
    expect(backend.plays).toEqual([{ name: 'blockHit', rate: 1.2, volume: 0.8 }]);
  });

  it('skips playback while muted or at zero volume', () => {
    const { manager, backend } = createManager();
    manager.setMuted(true);
    manager.playSE('paddleHit');
    manager.setMuted(false);
    manager.setSEVolume(0);
    manager.playSE('paddleHit');
    expect(backend.plays).toHaveLength(0);
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
    const { manager } = createManager(90);
    manager.setSEVolume(25);
    manager.toggleMute();

    const { manager: reloaded } = createManager(90);
    expect(reloaded.getSEVolume()).toBe(25);
    expect(reloaded.isMuted()).toBe(true);
  });

  it('uses the config default when nothing is stored', () => {
    const { manager } = createManager(70);
    expect(manager.getSEVolume()).toBe(70);
    expect(manager.isMuted()).toBe(false);
  });
});
