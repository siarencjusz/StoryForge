import { describe, it, expect } from 'vitest';
import { nextVersionKey } from '../constants';

describe('nextVersionKey', () => {
  it('returns v1 for an empty list', () => {
    expect(nextVersionKey([])).toBe('v1');
  });

  it('increments past the highest existing version', () => {
    expect(nextVersionKey(['v1', 'v2', 'v3'])).toBe('v4');
  });

  it('does not collide with an existing version after earlier ones are deleted', () => {
    // v1 deleted: count-based logic would have produced v3 and overwritten it.
    expect(nextVersionKey(['v2', 'v3'])).toBe('v4');
  });

  it('uses the max suffix regardless of ordering', () => {
    expect(nextVersionKey(['v3', 'v1', 'v2'])).toBe('v4');
  });

  it('ignores non-default version names', () => {
    expect(nextVersionKey(['draft', 'final'])).toBe('v1');
    expect(nextVersionKey(['v2', 'custom'])).toBe('v3');
  });
});
