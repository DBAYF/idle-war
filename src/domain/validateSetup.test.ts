import { describe, it, expect } from 'vitest';
import { validateSetup } from './validateSetup';
import { DEFAULT_MATCH_CONFIG } from './constants';
import type { MatchConfig } from './types';

describe('validateSetup', () => {
  const validConfig: MatchConfig = { ...DEFAULT_MATCH_CONFIG };

  it('returns valid for default config', () => {
    const result = validateSetup(validConfig, '1v1', false);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid for 2v2 and ffa modes', () => {
    expect(validateSetup({ ...validConfig, mode: '2v2' }, '2v2', false).valid).toBe(true);
    expect(validateSetup({ ...validConfig, mode: 'ffa' }, 'ffa', false).valid).toBe(true);
  });

  it('returns invalid when durationSec < 120', () => {
    const result = validateSetup({ ...validConfig, durationSec: 60 }, '1v1', false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duration must be between 2 and 10 minutes.');
  });

  it('returns invalid when durationSec > 600', () => {
    const result = validateSetup({ ...validConfig, durationSec: 900 }, '1v1', false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Duration must be between 2 and 10 minutes.');
  });

  it('returns invalid when winThreshold < 500', () => {
    const result = validateSetup({ ...validConfig, winThreshold: 100 }, '1v1', false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Win goal must be between 500 and 3000.');
  });

  it('returns invalid when winThreshold > 3000', () => {
    const result = validateSetup({ ...validConfig, winThreshold: 5000 }, '1v1', false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Win goal must be between 500 and 3000.');
  });

  it('returns invalid for invalid mode', () => {
    const result = validateSetup(validConfig, 'invalid' as '1v1', false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid match mode.');
  });

  it('returns valid for multiplayer with mode 1v1', () => {
    const result = validateSetup({ ...validConfig, mode: '1v1' }, '1v1', true);
    expect(result.valid).toBe(true);
  });
});
