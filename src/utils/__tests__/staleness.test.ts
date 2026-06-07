import { describe, it, expect } from 'vitest';
import {
  computeSignature,
  resolvedPromptFor,
  getVersionStaleness,
  getStageStaleness,
  getBlockStaleness,
  collectStaleStages,
  topoSortBlocks,
} from '../staleness';
import type { Blocks, Stage } from '../../types';

/** Helper to build a stage with a selected version and its signature recorded. */
function stage(input: string, output: string, blocks: Blocks): Stage {
  const resolved = resolvedPromptFor(blocks, input);
  return {
    input,
    selected: 'v1',
    output: { v1: output },
    signatures: { v1: computeSignature(resolved) },
  };
}

describe('computeSignature', () => {
  it('is deterministic and differs for different inputs', () => {
    expect(computeSignature('hello')).toBe(computeSignature('hello'));
    expect(computeSignature('hello')).not.toBe(computeSignature('world'));
  });

  it('returns an 8-char hex string', () => {
    expect(computeSignature('anything')).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe('getVersionStaleness', () => {
  it("returns 'unknown' when no signature was recorded", () => {
    const blocks: Blocks = {
      story: { intro: { main: { input: 'hi', selected: 'v1', output: { v1: 'out' } } } },
    };
    expect(getVersionStaleness(blocks, 'story', 'intro', 'main', 'v1')).toBe('unknown');
  });

  it("returns 'fresh' when the input is unchanged", () => {
    const blocks: Blocks = { story: { intro: {} } };
    blocks.story.intro.main = stage('static prompt', 'out', blocks);
    expect(getVersionStaleness(blocks, 'story', 'intro', 'main', 'v1')).toBe('fresh');
  });

  it("returns 'stale' after the input changes", () => {
    const blocks: Blocks = { story: { intro: {} } };
    blocks.story.intro.main = stage('original', 'out', blocks);
    blocks.story.intro.main.input = 'edited prompt';
    expect(getVersionStaleness(blocks, 'story', 'intro', 'main', 'v1')).toBe('stale');
  });

  it("returns 'stale' when a referenced dependency's output changes", () => {
    const blocks: Blocks = {
      story: {
        hero: { output: { input: 'A brave knight', selected: 'v1', output: { v1: 'A brave knight' } } },
        intro: {},
      },
    };
    blocks.story.intro.main = stage('Describe [hero]', 'desc', blocks);
    expect(getStageStaleness(blocks, 'story', 'intro', 'main')).toBe('fresh');

    // Change the dependency's selected output
    blocks.story.hero.output.output.v1 = 'A cowardly knight';
    expect(getStageStaleness(blocks, 'story', 'intro', 'main')).toBe('stale');
  });
});

describe('getBlockStaleness', () => {
  it("is 'stale' if any stage is stale", () => {
    const blocks: Blocks = { c: { b: {} } };
    blocks.c.b.s1 = stage('one', 'o1', blocks);
    blocks.c.b.s2 = stage('two', 'o2', blocks);
    blocks.c.b.s2.input = 'changed';
    expect(getBlockStaleness(blocks, 'c', 'b')).toBe('stale');
  });

  it("is 'unknown' when no stage has a signature", () => {
    const blocks: Blocks = {
      c: { b: { s1: { input: 'x', selected: 'v1', output: { v1: 'o' } } } },
    };
    expect(getBlockStaleness(blocks, 'c', 'b')).toBe('unknown');
  });
});

describe('collectStaleStages', () => {
  it('lists only stale stages', () => {
    const blocks: Blocks = { c: { b: {} } };
    blocks.c.b.fresh = stage('keep', 'o', blocks);
    blocks.c.b.stale = stage('orig', 'o', blocks);
    blocks.c.b.stale.input = 'changed';
    const result = collectStaleStages(blocks);
    expect(result).toEqual([{ category: 'c', block: 'b', stage: 'stale' }]);
  });
});

describe('topoSortBlocks', () => {
  it('orders dependencies before dependents', () => {
    const blocks: Blocks = {
      cat: {
        base: { main: { input: 'root', selected: '', output: {} } },
        mid: { main: { input: 'uses [base]', selected: '', output: {} } },
        top: { main: { input: 'uses [mid]', selected: '', output: {} } },
      },
    };
    const order = topoSortBlocks(blocks).map((n) => n.block);
    expect(order.indexOf('base')).toBeLessThan(order.indexOf('mid'));
    expect(order.indexOf('mid')).toBeLessThan(order.indexOf('top'));
  });

  it('includes every block even with a dependency cycle', () => {
    const blocks: Blocks = {
      cat: {
        a: { main: { input: 'uses [b]', selected: '', output: {} } },
        b: { main: { input: 'uses [a]', selected: '', output: {} } },
      },
    };
    const order = topoSortBlocks(blocks).map((n) => n.block).sort();
    expect(order).toEqual(['a', 'b']);
  });
});
