import { describe, it, expect } from 'vitest';
import {
  isValidName,
  validateName,
  sanitizeName,
  NAME_PATTERN,
  MAX_NAME_LENGTH,
} from '../nameValidation';

// ---------------------------------------------------------------------------
// isValidName
// ---------------------------------------------------------------------------

describe('isValidName', () => {
  it('accepts simple lowercase names', () => {
    expect(isValidName('alice')).toBe(true);
    expect(isValidName('character')).toBe(true);
    expect(isValidName('raw')).toBe(true);
  });

  it('accepts names with underscores', () => {
    expect(isValidName('dark_forest')).toBe(true);
    expect(isValidName('scene_2_intro')).toBe(true);
    expect(isValidName('_private')).toBe(true);
  });

  it('accepts names with digits (not leading)', () => {
    expect(isValidName('scene2')).toBe(true);
    expect(isValidName('v1')).toBe(true);
    expect(isValidName('chapter_10')).toBe(true);
  });

  it('accepts uppercase and mixed case', () => {
    expect(isValidName('Alice')).toBe(true);
    expect(isValidName('GLOBAL')).toBe(true);
    expect(isValidName('myBlock')).toBe(true);
  });

  it('accepts single-character names', () => {
    expect(isValidName('a')).toBe(true);
    expect(isValidName('Z')).toBe(true);
    expect(isValidName('_')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('rejects names starting with a digit', () => {
    expect(isValidName('1scene')).toBe(false);
    expect(isValidName('0_start')).toBe(false);
    expect(isValidName('42')).toBe(false);
  });

  it('rejects names with spaces', () => {
    expect(isValidName('dark forest')).toBe(false);
    expect(isValidName(' alice')).toBe(false);
    expect(isValidName('alice ')).toBe(false);
  });

  it('rejects names with hyphens', () => {
    expect(isValidName('dark-forest')).toBe(false);
    expect(isValidName('my-block')).toBe(false);
  });

  it('rejects names with special characters', () => {
    expect(isValidName('alice!')).toBe(false);
    expect(isValidName('block@1')).toBe(false);
    expect(isValidName('scene#2')).toBe(false);
    expect(isValidName('name.stage')).toBe(false);
  });

  it('rejects names with colons (reference separator)', () => {
    expect(isValidName('cat:block')).toBe(false);
  });

  it('rejects names with brackets (reference delimiters)', () => {
    expect(isValidName('[alice]')).toBe(false);
    expect(isValidName('alice]')).toBe(false);
  });

  it('rejects names exceeding max length', () => {
    const longName = 'a'.repeat(MAX_NAME_LENGTH + 1);
    expect(isValidName(longName)).toBe(false);
  });

  it('accepts names at exactly max length', () => {
    const maxName = 'a'.repeat(MAX_NAME_LENGTH);
    expect(isValidName(maxName)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateName — error messages
// ---------------------------------------------------------------------------

describe('validateName', () => {
  it('returns valid:true for good names', () => {
    expect(validateName('alice')).toEqual({ valid: true });
    expect(validateName('dark_forest')).toEqual({ valid: true });
    expect(validateName('_tmp')).toEqual({ valid: true });
  });

  it('returns error for empty name', () => {
    const result = validateName('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('returns error for names exceeding max length', () => {
    const result = validateName('a'.repeat(MAX_NAME_LENGTH + 1));
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_NAME_LENGTH}`);
  });

  it('returns error for names starting with digit', () => {
    const result = validateName('1bad');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('start with a letter or underscore');
  });

  it('returns error for names with disallowed characters', () => {
    const result = validateName('has space');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letters, digits, and underscores');
  });

  it('returns error for hyphenated names', () => {
    const result = validateName('my-block');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('letters, digits, and underscores');
  });
});

// ---------------------------------------------------------------------------
// sanitizeName
// ---------------------------------------------------------------------------

describe('sanitizeName', () => {
  it('returns the name unchanged if already valid', () => {
    expect(sanitizeName('alice')).toBe('alice');
    expect(sanitizeName('dark_forest')).toBe('dark_forest');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeName('dark forest')).toBe('dark_forest');
    expect(sanitizeName('my block name')).toBe('my_block_name');
  });

  it('replaces hyphens with underscores', () => {
    expect(sanitizeName('my-block')).toBe('my_block');
  });

  it('prepends underscore if starts with digit', () => {
    expect(sanitizeName('1scene')).toBe('_1scene');
  });

  it('collapses consecutive underscores', () => {
    expect(sanitizeName('a  b')).toBe('a_b');
    expect(sanitizeName('a---b')).toBe('a_b');
  });

  it('strips trailing underscores', () => {
    expect(sanitizeName('alice ')).toBe('alice');
    expect(sanitizeName('alice--')).toBe('alice');
  });

  it('removes disallowed characters', () => {
    expect(sanitizeName('alice!')).toBe('alice');
    expect(sanitizeName('block@name')).toBe('block_name');
  });

  it('returns null for completely unsalvageable input', () => {
    expect(sanitizeName('')).toBeNull();
    expect(sanitizeName('!!!')).toBeNull();
  });

  it('trims to max length', () => {
    const long = 'a'.repeat(100);
    const result = sanitizeName(long);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(MAX_NAME_LENGTH);
    expect(isValidName(result!)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// NAME_PATTERN consistency with reference regex
// ---------------------------------------------------------------------------

describe('NAME_PATTERN consistency', () => {
  it('matches the identifier portion of the reference regex in referenceUtils', () => {
    // The REFERENCE_PATTERN in referenceUtils.ts uses [a-zA-Z_][a-zA-Z0-9_]*
    // for each segment.  Make sure NAME_PATTERN enforces the same.
    const identifierPart = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

    const samples = ['alice', 'dark_forest', '_tmp', 'A1', 'scene2'];
    for (const s of samples) {
      expect(NAME_PATTERN.test(s)).toBe(identifierPart.test(s));
    }

    const bad = ['1bad', 'has space', 'a-b', ''];
    for (const s of bad) {
      expect(NAME_PATTERN.test(s)).toBe(identifierPart.test(s));
    }
  });
});

