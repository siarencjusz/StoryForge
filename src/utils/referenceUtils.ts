/**
 * Reference resolution utilities
 * Resolves [category:block] and [category:block:stage] references in input text
 */

import type { Blocks } from '../types';

// Pattern to match references like [block], [category:block], or [category:block:stage]
const REFERENCE_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]/g;

interface ResolvedReference {
  original: string;    // The original [ref] text
  ref: string;         // The reference string inside brackets
  content: string | null;  // Resolved content or null if not found
  error?: string;      // Error message if resolution failed
}

/**
 * Get the selected output for a block/stage
 */
function getBlockOutput(
  blocks: Blocks,
  category: string,
  blockName: string,
  stageName?: string
): string | null {
  const catData = blocks[category];
  if (!catData) return null;

  const blockData = catData[blockName];
  if (!blockData) return null;

  // If stage specified, use that
  if (stageName) {
    const stage = blockData[stageName];
    if (!stage) return null;
    return stage.selected ? (stage.output[stage.selected] ?? null) : null;
  }

  // Otherwise, try to find default stage
  // Priority: 'output', 'raw', first stage
  const stageNames = Object.keys(blockData);
  let targetStage = stageNames.includes('output')
    ? 'output'
    : stageNames.includes('raw')
      ? 'raw'
      : stageNames[0];

  if (!targetStage) return null;

  const stage = blockData[targetStage];
  return stage?.selected ? (stage.output[stage.selected] ?? null) : null;
}

/**
 * Find a block across all categories (for short references like [alice])
 */
function findBlockAcrossCategories(
  blocks: Blocks,
  blockName: string
): { category: string; block: string } | null {
  for (const [category, catBlocks] of Object.entries(blocks)) {
    if (catBlocks[blockName]) {
      return { category, block: blockName };
    }
  }
  return null;
}

/**
 * Resolve a single reference
 */
function resolveReference(ref: string, blocks: Blocks): { content: string | null; error?: string } {
  const parts = ref.split(':');

  if (parts.length === 1) {
    // Just block name - search all categories
    const found = findBlockAcrossCategories(blocks, parts[0]);
    if (!found) {
      return { content: null, error: `Block '${parts[0]}' not found` };
    }
    const content = getBlockOutput(blocks, found.category, found.block);
    if (content === null) {
      return { content: null, error: `Block '${parts[0]}' has no selected output` };
    }
    return { content };
  }

  if (parts.length === 2) {
    // category:block
    const [category, blockName] = parts;
    const content = getBlockOutput(blocks, category, blockName);
    if (content === null) {
      const catExists = blocks[category];
      if (!catExists) {
        return { content: null, error: `Category '${category}' not found` };
      }
      const blockExists = catExists[blockName];
      if (!blockExists) {
        return { content: null, error: `Block '${category}:${blockName}' not found` };
      }
      return { content: null, error: `Block '${category}:${blockName}' has no selected output` };
    }
    return { content };
  }

  if (parts.length === 3) {
    // category:block:stage
    const [category, blockName, stageName] = parts;
    const content = getBlockOutput(blocks, category, blockName, stageName);
    if (content === null) {
      return { content: null, error: `Reference '${ref}' not found or has no selected output` };
    }
    return { content };
  }

  return { content: null, error: `Invalid reference format: '${ref}'` };
}

/**
 * Resolve all references in an input text
 * Returns the resolved text and any errors encountered
 */
export function resolveReferences(
  input: string,
  blocks: Blocks
): { resolved: string; errors: string[]; references: ResolvedReference[] } {
  const errors: string[] = [];
  const references: ResolvedReference[] = [];

  const resolved = input.replace(REFERENCE_PATTERN, (match, ref) => {
    const result = resolveReference(ref, blocks);

    references.push({
      original: match,
      ref,
      content: result.content,
      error: result.error,
    });

    if (result.error) {
      errors.push(result.error);
      return match; // Keep original if not resolved
    }

    return result.content ?? match;
  });

  return { resolved, errors, references };
}

