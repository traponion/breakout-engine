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
});
