import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, loadConfig } from './index';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('loadConfig', () => {
  it('returns defaults when no config is present', () => {
    expect(loadConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('accepts a valid config', () => {
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: {
        difficulty: 'hard',
        bgmVolume: 0,
        seVolume: 100,
        lang: 'en',
        showMascotComments: false,
        rewards: [{ minScore: 0, src: 'assets/rewards/reward-001.webp' }],
      },
    });
    expect(loadConfig()).toEqual({
      difficulty: 'hard',
      bgmVolume: 0,
      seVolume: 100,
      lang: 'en',
      showMascotComments: false,
      rewards: [{ minScore: 0, src: 'assets/rewards/reward-001.webp' }],
      sounds: DEFAULT_CONFIG.sounds,
    });
  });

  it('falls back to defaults for invalid fields and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: {
        difficulty: 'impossible',
        bgmVolume: 999,
        lang: 'fr',
        showMascotComments: 'yes',
      },
    });
    const config = loadConfig();
    expect(config.difficulty).toBe(DEFAULT_CONFIG.difficulty);
    expect(config.bgmVolume).toBe(DEFAULT_CONFIG.bgmVolume);
    expect(config.lang).toBe(DEFAULT_CONFIG.lang);
    expect(config.showMascotComments).toBe(DEFAULT_CONFIG.showMascotComments);
    expect(config.rewards).toEqual(DEFAULT_CONFIG.rewards);
    expect(warn).toHaveBeenCalled();
  });

  it('drops malformed reward entries but keeps valid ones', () => {
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: {
        rewards: [
          { minScore: 0, src: 'assets/rewards/reward-001.webp' },
          { minScore: 'nope', src: 5 },
        ],
      },
    });
    expect(loadConfig().rewards).toEqual([{ minScore: 0, src: 'assets/rewards/reward-001.webp' }]);
  });

  it('merges per-SE sound overrides over the convention defaults', () => {
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: {
        sounds: { paddleHit: 'assets/sounds/custom-hit.mp3' },
      },
    });
    const config = loadConfig();
    expect(config.sounds.paddleHit).toBe('assets/sounds/custom-hit.mp3');
    expect(config.sounds.blockBreak).toBe('assets/sounds/se-blockBreak.mp3');
  });

  it('warns on unknown sound names and non-string paths, keeping defaults', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: {
        sounds: { explosion: 'assets/sounds/boom.mp3', paddleHit: 42 },
      },
    });
    const config = loadConfig();
    expect(config.sounds).toEqual(DEFAULT_CONFIG.sounds);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('falls back to default sounds when the sounds field is not an object', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('window', {
      BREAKOUT_CONFIG: { sounds: 'loud' },
    });
    expect(loadConfig().sounds).toEqual(DEFAULT_CONFIG.sounds);
    expect(warn).toHaveBeenCalled();
  });
});
