import { describe, expect, it } from 'vitest';
import { ENGINE_NAME } from './main.js';

describe('engine entry', () => {
  it('exports the engine identifier', () => {
    expect(ENGINE_NAME).toBe('breakout-engine');
  });
});
