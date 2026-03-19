import { describe, it, expect } from 'vitest';
import { validateContent } from './validateContent';

describe('validateContent', () => {
  it('validates units and upgrades', () => {
    const { valid, errors } = validateContent();
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });
});
