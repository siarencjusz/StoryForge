/**
 * Staleness detection utilities.
 *
 * An output version is "stale" when the resolved prompt that would be produced
 * from its stage input *now* (references expanded, comments stripped) no longer
 * matches the signature recorded when that version was generated. This captures
 * both direct edits to the input and changes to any transitive dependency.
 */

import type { Blocks } from '../types';
import { resolveReferences, stripComments, parseReferences, referencePointsToBlock } from './referenceUtils';

export type Staleness = 'fresh' | 'stale' | 'unknown';

/**
 * Compute a stable signature for a resolved prompt using a 32-bit FNV-1a hash.
 * Returns an 8-char hex string. Deterministic and dependency-free.
 */
export function computeSignature(resolvedPrompt: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < resolvedPrompt.length; i++) {
    hash ^= resolvedPrompt.charCodeAt(i);
    // hash *= 16777619 (FNV prime), kept in 32-bit range
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Resolve a stage's input to the prompt that would be sent to the LLM. */
export function resolvedPromptFor(blocks: Blocks, input: string): string {
  return resolveReferences(stripComments(input), blocks).resolved;
}

/** Staleness of a single output version within a stage. */
export function getVersionStaleness(
  blocks: Blocks,
  category: string,
  block: string,
  stage: string,
  version: string
): Staleness {
  const stageData = blocks[category]?.[block]?.[stage];
  if (!stageData || stageData.output[version] === undefined) return 'unknown';

  const signature = stageData.signatures?.[version];
  // No recorded signature (manually authored or pre-feature content) → can't judge.
  if (!signature) return 'unknown';

  const current = computeSignature(resolvedPromptFor(blocks, stageData.input));
  return current === signature ? 'fresh' : 'stale';
}

/** Staleness of a stage, based on its currently selected version. */
export function getStageStaleness(
  blocks: Blocks,
  category: string,
  block: string,
  stage: string
): Staleness {
  const stageData = blocks[category]?.[block]?.[stage];
  if (!stageData) return 'unknown';
  const selected = stageData.selected;
  if (!selected || stageData.output[selected] === undefined) return 'unknown';
  return getVersionStaleness(blocks, category, block, stage, selected);
}

/** Staleness of a block — stale if any of its stages' selected output is stale. */
export function getBlockStaleness(blocks: Blocks, category: string, block: string): Staleness {
  const blockData = blocks[category]?.[block];
  if (!blockData) return 'unknown';

  let sawFresh = false;
  for (const stage of Object.keys(blockData)) {
    const s = getStageStaleness(blocks, category, block, stage);
    if (s === 'stale') return 'stale';
    if (s === 'fresh') sawFresh = true;
  }
  return sawFresh ? 'fresh' : 'unknown';
}

export interface StaleStage {
  category: string;
  block: string;
  stage: string;
}

/** Collect every stage in the project whose selected output is currently stale. */
export function collectStaleStages(blocks: Blocks): StaleStage[] {
  const result: StaleStage[] = [];
  for (const [category, cat] of Object.entries(blocks)) {
    for (const [block, blk] of Object.entries(cat)) {
      for (const stage of Object.keys(blk)) {
        if (getStageStaleness(blocks, category, block, stage) === 'stale') {
          result.push({ category, block, stage });
        }
      }
    }
  }
  return result;
}

/** Identifier helper: "category:block". */
function blockKey(category: string, block: string): string {
  return `${category}:${block}`;
}

/**
 * Topologically sort all blocks so that dependencies come before the blocks
 * that reference them. Uses Kahn's algorithm; any nodes left in a cycle are
 * appended in stable order so the result always contains every block.
 */
export function topoSortBlocks(blocks: Blocks): Array<{ category: string; block: string }> {
  const nodes: Array<{ category: string; block: string }> = [];
  const indexByKey = new Map<string, number>();
  for (const [category, cat] of Object.entries(blocks)) {
    for (const block of Object.keys(cat)) {
      indexByKey.set(blockKey(category, block), nodes.length);
      nodes.push({ category, block });
    }
  }

  // Build dependency edges: dependency -> dependent
  const dependents = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const { category, block } of nodes) {
    inDegree.set(blockKey(category, block), 0);
  }

  for (const { category, block } of nodes) {
    const blk = blocks[category][block];
    const depKeys = new Set<string>();
    for (const stageData of Object.values(blk)) {
      for (const ref of parseReferences(stageData.input || '')) {
        for (const other of nodes) {
          if (other.category === category && other.block === block) continue;
          if (referencePointsToBlock(ref, other.category, other.block)) {
            depKeys.add(blockKey(other.category, other.block));
          }
        }
      }
    }
    const dependentKey = blockKey(category, block);
    for (const depKey of depKeys) {
      if (!dependents.has(depKey)) dependents.set(depKey, new Set());
      const set = dependents.get(depKey)!;
      if (!set.has(dependentKey)) {
        set.add(dependentKey);
        inDegree.set(dependentKey, (inDegree.get(dependentKey) ?? 0) + 1);
      }
    }
  }

  const order: Array<{ category: string; block: string }> = [];
  const queue: string[] = [];
  for (const { category, block } of nodes) {
    const key = blockKey(category, block);
    if ((inDegree.get(key) ?? 0) === 0) queue.push(key);
  }

  const visited = new Set<string>();
  while (queue.length > 0) {
    const key = queue.shift()!;
    if (visited.has(key)) continue;
    visited.add(key);
    order.push(nodes[indexByKey.get(key)!]);
    for (const dependentKey of dependents.get(key) ?? []) {
      inDegree.set(dependentKey, (inDegree.get(dependentKey) ?? 1) - 1);
      if ((inDegree.get(dependentKey) ?? 0) === 0) queue.push(dependentKey);
    }
  }

  // Append any remaining nodes (cycles) in stable order.
  for (const node of nodes) {
    const key = blockKey(node.category, node.block);
    if (!visited.has(key)) order.push(node);
  }

  return order;
}
