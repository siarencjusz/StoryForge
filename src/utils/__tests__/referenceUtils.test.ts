import { describe, it, expect } from 'vitest';
import {
  resolveReferences,
  getInputSegments,
  parseRef,
  parseReferences,
  isReferenceValid,
  getReferenceOutput,
  referencePointsToBlock,
  propagateBlockRename,
  propagateCategoryRename,
  transformAllInputs,
} from '../referenceUtils';
import type { Blocks } from '../../types';

// ---------------------------------------------------------------------------
// parseRef
// ---------------------------------------------------------------------------

describe('parseRef', () => {
  it('parses 1-part reference (block only)', () => {
    expect(parseRef('alice')).toEqual({ block: 'alice' });
  });

  it('parses 2-part reference (category:block)', () => {
    expect(parseRef('characters:alice')).toEqual({ category: 'characters', block: 'alice' });
  });

  it('parses 3-part reference (category:block:stage)', () => {
    expect(parseRef('characters:alice:raw')).toEqual({ category: 'characters', block: 'alice', stage: 'raw' });
  });

  it('returns null for 4+ part reference', () => {
    expect(parseRef('a:b:c:d')).toBeNull();
  });

  it('returns null for empty-split edge case with many colons', () => {
    expect(parseRef('a:b:c:d:e')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// propagateBlockRename
// ---------------------------------------------------------------------------

describe('propagateBlockRename', () => {
  it('renames short references [oldBlock] → [newBlock]', () => {
    const text = 'See [alice] for details.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'alice_v2');
    expect(result).toBe('See [alice_v2] for details.');
  });

  it('renames qualified references [cat:oldBlock] → [cat:newBlock]', () => {
    const text = 'Use [characters:alice] here.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('Use [characters:bob] here.');
  });

  it('renames fully qualified references [cat:oldBlock:stage] → [cat:newBlock:stage]', () => {
    const text = 'Use [characters:alice:raw] here.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('Use [characters:bob:raw] here.');
  });

  it('does not rename qualified references in other categories', () => {
    const text = 'Use [locations:alice] here.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('Use [locations:alice] here.');
  });

  it('does not rename unrelated references', () => {
    const text = 'See [bob] and [characters:carol].';
    const result = propagateBlockRename(text, 'characters', 'alice', 'alice_v2');
    expect(result).toBe('See [bob] and [characters:carol].');
  });

  it('handles multiple references in same text', () => {
    const text = '[alice] said hello to [characters:alice] at [characters:alice:output].';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('[bob] said hello to [characters:bob] at [characters:bob:output].');
  });

  it('handles text with no references', () => {
    const text = 'No references here.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('No references here.');
  });

  it('handles empty text', () => {
    expect(propagateBlockRename('', 'cat', 'old', 'new')).toBe('');
  });

  it('preserves surrounding text exactly', () => {
    const text = 'Before [alice] middle [characters:alice] after.';
    const result = propagateBlockRename(text, 'characters', 'alice', 'bob');
    expect(result).toBe('Before [bob] middle [characters:bob] after.');
  });
});

// ---------------------------------------------------------------------------
// propagateCategoryRename
// ---------------------------------------------------------------------------

describe('propagateCategoryRename', () => {
  it('renames 2-part references [oldCat:block] → [newCat:block]', () => {
    const text = 'See [characters:alice].';
    const result = propagateCategoryRename(text, 'characters', 'people');
    expect(result).toBe('See [people:alice].');
  });

  it('renames 3-part references [oldCat:block:stage] → [newCat:block:stage]', () => {
    const text = 'See [characters:alice:raw].';
    const result = propagateCategoryRename(text, 'characters', 'people');
    expect(result).toBe('See [people:alice:raw].');
  });

  it('does not affect short references [block]', () => {
    const text = 'See [alice].';
    const result = propagateCategoryRename(text, 'characters', 'people');
    expect(result).toBe('See [alice].');
  });

  it('does not rename references to other categories', () => {
    const text = 'See [locations:forest].';
    const result = propagateCategoryRename(text, 'characters', 'people');
    expect(result).toBe('See [locations:forest].');
  });

  it('handles multiple mixed references', () => {
    const text = '[alice] and [characters:bob] at [characters:carol:raw] near [locations:forest]';
    const result = propagateCategoryRename(text, 'characters', 'people');
    expect(result).toBe('[alice] and [people:bob] at [people:carol:raw] near [locations:forest]');
  });

  it('handles empty text', () => {
    expect(propagateCategoryRename('', 'old', 'new')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// transformAllInputs
// ---------------------------------------------------------------------------

describe('transformAllInputs', () => {
  const makeStage = (input: string) => ({
    input,
    selected: '',
    output: {},
  });

  it('applies transform to all stage inputs across all blocks', () => {
    const blocks: Blocks = {
      characters: {
        alice: {
          raw: makeStage('I am [bob]'),
          refined: makeStage('I am [bob] too'),
        },
        bob: {
          raw: makeStage('No refs here'),
        },
      },
      locations: {
        forest: {
          raw: makeStage('Near [bob]'),
        },
      },
    };

    const result = transformAllInputs(blocks, (input) =>
      propagateBlockRename(input, 'characters', 'bob', 'robert')
    );

    expect(result.characters.alice.raw.input).toBe('I am [robert]');
    expect(result.characters.alice.refined.input).toBe('I am [robert] too');
    expect(result.characters.bob.raw.input).toBe('No refs here');
    expect(result.locations.forest.raw.input).toBe('Near [robert]');
  });

  it('preserves unchanged stages by reference', () => {
    const blocks: Blocks = {
      cat: {
        block: {
          raw: makeStage('No refs'),
        },
      },
    };

    const result = transformAllInputs(blocks, (input) =>
      propagateBlockRename(input, 'cat', 'nonexistent', 'whatever')
    );

    // No changes, so the stage object should be the same reference
    expect(result.cat.block.raw).toBe(blocks.cat.block.raw);
  });

  it('handles empty blocks', () => {
    const blocks: Blocks = {};
    const result = transformAllInputs(blocks, (input) => input);
    expect(result).toEqual({});
  });

  it('handles blocks with no stages', () => {
    const blocks: Blocks = {
      cat: {
        emptyBlock: {},
      },
    };
    const result = transformAllInputs(blocks, (input) => input);
    expect(result).toEqual({ cat: { emptyBlock: {} } });
  });

  it('end-to-end: category rename propagates correctly', () => {
    const blocks: Blocks = {
      chars: {
        alice: {
          raw: makeStage('[chars:bob] is a friend'),
        },
        bob: {
          raw: makeStage('[chars:alice:raw] said hi'),
        },
      },
      locations: {
        forest: {
          raw: makeStage('[alice] lives near [chars:alice]'),
        },
      },
    };

    const result = transformAllInputs(blocks, (input) =>
      propagateCategoryRename(input, 'chars', 'characters')
    );

    expect(result.chars.alice.raw.input).toBe('[characters:bob] is a friend');
    expect(result.chars.bob.raw.input).toBe('[characters:alice:raw] said hi');
    expect(result.locations.forest.raw.input).toBe('[alice] lives near [characters:alice]');
  });
});

// ---------------------------------------------------------------------------
// Shared reference query utilities
// ---------------------------------------------------------------------------

/** Helper to build test blocks */
function makeBlocks(): Blocks {
  return {
    characters: {
      alice: {
        raw: { input: 'prompt', selected: 'v1', output: { v1: 'Alice is brave.' } },
        refined: { input: '[alice]', selected: 'v1', output: { v1: 'Alice is very brave.' } },
      },
      bob: {
        output: { input: '[alice]', selected: 'v1', output: { v1: 'Bob is shy.' } },
      },
    },
    locations: {
      forest: {
        output: { input: '', selected: 'v1', output: { v1: 'A dark forest.' } },
      },
    },
  };
}

describe('parseReferences', () => {
  it('extracts unique reference strings from text', () => {
    const refs = parseReferences('Hello [alice] and [characters:bob] and [alice]');
    expect(refs).toEqual(['alice', 'characters:bob']);
  });

  it('returns empty array for text without references', () => {
    expect(parseReferences('No references here.')).toEqual([]);
  });

  it('handles 3-part references', () => {
    const refs = parseReferences('[characters:alice:raw] test');
    expect(refs).toEqual(['characters:alice:raw']);
  });

  it('returns empty array for empty text', () => {
    expect(parseReferences('')).toEqual([]);
  });
});

describe('isReferenceValid', () => {
  const blocks = makeBlocks();

  it('validates 1-part reference that exists', () => {
    expect(isReferenceValid('alice', blocks)).toBe(true);
  });

  it('invalidates 1-part reference that does not exist', () => {
    expect(isReferenceValid('nonexistent', blocks)).toBe(false);
  });

  it('validates 2-part reference that exists', () => {
    expect(isReferenceValid('characters:alice', blocks)).toBe(true);
  });

  it('invalidates 2-part reference with wrong category', () => {
    expect(isReferenceValid('locations:alice', blocks)).toBe(false);
  });

  it('validates 3-part reference that exists', () => {
    expect(isReferenceValid('characters:alice:raw', blocks)).toBe(true);
  });

  it('invalidates 3-part reference with wrong stage', () => {
    expect(isReferenceValid('characters:alice:nonexistent', blocks)).toBe(false);
  });
});

describe('getReferenceOutput', () => {
  const blocks = makeBlocks();

  it('gets output for 1-part reference (finds in first matching category)', () => {
    // alice has stages "raw" and "refined", default priority: output > raw > first
    // alice has no "output" stage, but has "raw", so picks "raw"
    expect(getReferenceOutput('alice', blocks)).toBe('Alice is brave.');
  });

  it('gets output for 2-part reference', () => {
    expect(getReferenceOutput('characters:bob', blocks)).toBe('Bob is shy.');
  });

  it('gets output for 3-part reference', () => {
    expect(getReferenceOutput('characters:alice:refined', blocks)).toBe('Alice is very brave.');
  });

  it('returns null for nonexistent reference', () => {
    expect(getReferenceOutput('nonexistent', blocks)).toBeNull();
  });

  it('returns null for nonexistent stage', () => {
    expect(getReferenceOutput('characters:alice:missing', blocks)).toBeNull();
  });
});

describe('referencePointsToBlock', () => {
  it('matches 1-part ref when block name matches', () => {
    expect(referencePointsToBlock('alice', 'characters', 'alice')).toBe(true);
  });

  it('does not match 1-part ref when block name differs', () => {
    expect(referencePointsToBlock('bob', 'characters', 'alice')).toBe(false);
  });

  it('matches 2-part ref when both category and block match', () => {
    expect(referencePointsToBlock('characters:alice', 'characters', 'alice')).toBe(true);
  });

  it('does not match 2-part ref when category differs', () => {
    expect(referencePointsToBlock('locations:alice', 'characters', 'alice')).toBe(false);
  });

  it('does not match 2-part ref that is actually category:block where block name equals target category', () => {
    // This was the old "Used by" false positive bug:
    // [alice:something] should NOT match target block "alice" because
    // 2-part refs are category:block, so "alice" here is the category
    expect(referencePointsToBlock('alice:something', 'characters', 'alice')).toBe(false);
  });

  it('matches 3-part ref when category and block match', () => {
    expect(referencePointsToBlock('characters:alice:raw', 'characters', 'alice')).toBe(true);
  });

  it('does not match 3-part ref when category differs', () => {
    expect(referencePointsToBlock('locations:alice:raw', 'characters', 'alice')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Ambiguity warnings (Bug #1 fix)
// ---------------------------------------------------------------------------

describe('resolveReferences — ambiguity warnings', () => {
  const makeStage = (input: string, output: string = ''): { input: string; selected: string; output: Record<string, string> } => ({
    input,
    selected: output ? 'v1' : '',
    output: output ? { v1: output } : {},
  });

  it('produces a warning when a short ref matches blocks in multiple categories', () => {
    const blocks: Blocks = {
      characters: {
        alice: { output: makeStage('', 'char alice') },
      },
      npcs: {
        alice: { output: makeStage('', 'npc alice') },
      },
    };

    const { resolved, errors, warnings } = resolveReferences('Hello [alice]', blocks);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('Ambiguous');
    expect(warnings[0]).toContain('characters');
    expect(warnings[0]).toContain('npcs');
    // Still resolves to first match
    expect(resolved).toContain('char alice');
  });

  it('does not warn when a short ref is unique', () => {
    const blocks: Blocks = {
      characters: {
        alice: { output: makeStage('', 'unique alice') },
      },
      locations: {
        forest: { output: makeStage('', 'a forest') },
      },
    };

    const { warnings } = resolveReferences('Hello [alice]', blocks);
    expect(warnings).toHaveLength(0);
  });

  it('does not warn for qualified refs even if block name exists elsewhere', () => {
    const blocks: Blocks = {
      characters: {
        alice: { output: makeStage('', 'char alice') },
      },
      npcs: {
        alice: { output: makeStage('', 'npc alice') },
      },
    };

    const { warnings } = resolveReferences('[characters:alice]', blocks);
    expect(warnings).toHaveLength(0);
  });
});

describe('getInputSegments — ambiguous type', () => {
  const makeStage = (input: string, output: string = ''): { input: string; selected: string; output: Record<string, string> } => ({
    input,
    selected: output ? 'v1' : '',
    output: output ? { v1: output } : {},
  });

  it('returns ambiguous segment type for ambiguous short refs', () => {
    const blocks: Blocks = {
      characters: {
        alice: { output: makeStage('', 'char') },
      },
      npcs: {
        alice: { output: makeStage('', 'npc') },
      },
    };

    const segments = getInputSegments('See [alice] here', blocks);
    const refSegment = segments.find(s => s.text === '[alice]');
    expect(refSegment).toBeDefined();
    expect(refSegment!.type).toBe('ambiguous');
  });

  it('returns resolved segment type for unique short refs', () => {
    const blocks: Blocks = {
      characters: {
        alice: { output: makeStage('', 'char') },
      },
    };

    const segments = getInputSegments('See [alice] here', blocks);
    const refSegment = segments.find(s => s.text === '[alice]');
    expect(refSegment).toBeDefined();
    expect(refSegment!.type).toBe('resolved');
  });
});

