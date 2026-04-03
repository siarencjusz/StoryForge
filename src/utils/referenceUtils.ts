/**
 * Reference resolution utilities
 * Resolves [category:block] and [category:block:stage] references in input text
 */

import type { Block, Blocks } from '../types';

// Pattern to match references like [block], [category:block], or [category:block:stage]
export const REFERENCE_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]/g;

interface ResolvedReference {
  original: string;    // The original [ref] text
  ref: string;         // The reference string inside brackets
  content: string | null;  // Resolved content or null if not found
  error?: string;      // Error message if resolution failed
  warning?: string;    // Warning message (e.g. ambiguous reference)
}

/**
 * Get the selected output for a block/stage
 */
export function getBlockOutput(
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
  const targetStage = stageNames.includes('output')
    ? 'output'
    : stageNames.includes('raw')
      ? 'raw'
      : stageNames[0];

  if (!targetStage) return null;

  const stage = blockData[targetStage];
  return stage?.selected ? (stage.output[stage.selected] ?? null) : null;
}

/**
 * Find a block across all categories (for short references like [alice]).
 * Returns the first match and a list of all matching categories.
 */
function findBlockAcrossCategories(
  blocks: Blocks,
  blockName: string
): { category: string; block: string; allCategories: string[] } | null {
  const matches: string[] = [];
  for (const [category, catBlocks] of Object.entries(blocks)) {
    if (catBlocks[blockName]) {
      matches.push(category);
    }
  }
  if (matches.length === 0) return null;
  return { category: matches[0], block: blockName, allCategories: matches };
}

/**
 * Resolve a single reference
 */
function resolveReference(ref: string, blocks: Blocks): { content: string | null; error?: string; warning?: string } {
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
    // Warn if the block exists in multiple categories
    if (found.allCategories.length > 1) {
      return {
        content,
        warning: `Ambiguous: [${parts[0]}] exists in categories: ${found.allCategories.join(', ')}. Using '${found.allCategories[0]}'. Qualify as [category:${parts[0]}] to be explicit.`,
      };
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
): { resolved: string; errors: string[]; warnings: string[]; references: ResolvedReference[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const references: ResolvedReference[] = [];

  const resolved = input.replace(REFERENCE_PATTERN, (match, ref) => {
    const result = resolveReference(ref, blocks);

    references.push({
      original: match,
      ref,
      content: result.content,
      error: result.error,
      warning: result.warning,
    });

    if (result.error) {
      errors.push(result.error);
      return match; // Keep original if not resolved
    }

    if (result.warning) {
      warnings.push(result.warning);
    }

    return result.content ?? match;
  });

  return { resolved, errors, warnings, references };
}

// ---------------------------------------------------------------------------
// Rename propagation — update references when blocks or categories are renamed
// ---------------------------------------------------------------------------

/**
 * Update all references in a single text string when a block is renamed.
 *
 * Handles:
 *  - `[oldBlock]`                → `[newBlock]`
 *  - `[category:oldBlock]`       → `[category:newBlock]`
 *  - `[category:oldBlock:stage]` → `[category:newBlock:stage]`
 */
export function propagateBlockRename(
  text: string,
  category: string,
  oldBlockName: string,
  newBlockName: string
): string {
  return text.replace(REFERENCE_PATTERN, (match, ref: string) => {
    const parts = ref.split(':');

    // [oldBlock] → [newBlock]
    if (parts.length === 1 && parts[0] === oldBlockName) {
      return `[${newBlockName}]`;
    }

    // [category:oldBlock] → [category:newBlock]
    if (parts.length === 2 && parts[0] === category && parts[1] === oldBlockName) {
      return `[${category}:${newBlockName}]`;
    }

    // [category:oldBlock:stage] → [category:newBlock:stage]
    if (parts.length === 3 && parts[0] === category && parts[1] === oldBlockName) {
      return `[${category}:${newBlockName}:${parts[2]}]`;
    }

    return match;
  });
}

/**
 * Update all references in a single text string when a category is renamed.
 *
 * Handles:
 *  - `[oldCat:block]`       → `[newCat:block]`
 *  - `[oldCat:block:stage]` → `[newCat:block:stage]`
 *
 * Single-part references `[block]` are unaffected by category renames.
 */
export function propagateCategoryRename(
  text: string,
  oldCategoryName: string,
  newCategoryName: string
): string {
  return text.replace(REFERENCE_PATTERN, (match, ref: string) => {
    const parts = ref.split(':');

    // [oldCat:block] → [newCat:block]
    if (parts.length === 2 && parts[0] === oldCategoryName) {
      return `[${newCategoryName}:${parts[1]}]`;
    }

    // [oldCat:block:stage] → [newCat:block:stage]
    if (parts.length === 3 && parts[0] === oldCategoryName) {
      return `[${newCategoryName}:${parts[1]}:${parts[2]}]`;
    }

    return match;
  });
}

/**
 * Apply a text transformation to all stage inputs across all blocks.
 * Returns a new Blocks object with updated inputs (unchanged stages keep original references).
 */
export function transformAllInputs(
  blocks: Blocks,
  transform: (input: string) => string
): Blocks {
  const newBlocks: Blocks = {};

  for (const [catName, category] of Object.entries(blocks)) {
    const newCategory: Record<string, Block> = {};

    for (const [blockName, block] of Object.entries(category)) {
      const newBlock: Block = {};

      for (const [stageName, stage] of Object.entries(block)) {
        const newInput = transform(stage.input);
        newBlock[stageName] = newInput !== stage.input
          ? { ...stage, input: newInput }
          : stage;
      }

      newCategory[blockName] = newBlock;
    }

    newBlocks[catName] = newCategory;
  }

  return newBlocks;
}

// ---------------------------------------------------------------------------
// Shared reference query utilities
// ---------------------------------------------------------------------------

/**
 * Extract all unique reference strings from input text.
 * Returns the inner ref strings (without brackets), deduplicated.
 */
export function parseReferences(text: string): string[] {
  const pattern = new RegExp(REFERENCE_PATTERN.source, 'g');
  return [...new Set([...text.matchAll(pattern)].map(m => m[1]))];
}

/**
 * Check whether a reference string resolves to a valid target in blocks.
 */
export function isReferenceValid(ref: string, blocks: Blocks): boolean {
  const parts = ref.split(':');

  if (parts.length === 1) {
    return findBlockAcrossCategories(blocks, parts[0]) !== null;
  }
  if (parts.length === 2) {
    return !!(blocks[parts[0]]?.[parts[1]]);
  }
  if (parts.length === 3) {
    return !!(blocks[parts[0]]?.[parts[1]]?.[parts[2]]);
  }
  return false;
}

/**
 * Get the selected output content for a reference string.
 * Handles 1-part (`[block]`), 2-part (`[cat:block]`), and 3-part (`[cat:block:stage]`) formats.
 */
export function getReferenceOutput(ref: string, blocks: Blocks): string | null {
  const parts = ref.split(':');

  if (parts.length === 1) {
    const found = findBlockAcrossCategories(blocks, parts[0]);
    if (!found) return null;
    return getBlockOutput(blocks, found.category, found.block);
  }
  if (parts.length === 2) {
    return getBlockOutput(blocks, parts[0], parts[1]);
  }
  if (parts.length === 3) {
    return getBlockOutput(blocks, parts[0], parts[1], parts[2]);
  }
  return null;
}

/**
 * Check whether a reference string points to a specific block.
 * Used for "used by" detection in the dependency panel.
 *
 * For 1-part refs `[name]`, matches if name equals the target block.
 * For 2-part refs `[cat:block]` and 3-part refs `[cat:block:stage]`,
 * matches only when both category and block match.
 */
export function referencePointsToBlock(
  ref: string,
  targetCategory: string,
  targetBlock: string,
): boolean {
  const parts = ref.split(':');

  if (parts.length === 1) {
    return parts[0] === targetBlock;
  }
  if (parts.length === 2) {
    return parts[0] === targetCategory && parts[1] === targetBlock;
  }
  if (parts.length === 3) {
    return parts[0] === targetCategory && parts[1] === targetBlock;
  }
  return false;
}

/** Segment type for highlighted input rendering */
export interface InputSegment {
  text: string;
  type: 'plain' | 'resolved' | 'error' | 'ambiguous';
}

/**
 * Split input text into segments with resolution status for highlighting.
 * Each segment is either plain text, a resolved reference, an ambiguous reference, or an unresolved reference.
 */
export function getInputSegments(input: string, blocks: Blocks): InputSegment[] {
  const segments: InputSegment[] = [];
  const pattern = new RegExp(REFERENCE_PATTERN.source, 'g');
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    // Add plain text before this match
    if (match.index > lastIndex) {
      segments.push({ text: input.slice(lastIndex, match.index), type: 'plain' });
    }

    // Check if this reference resolves
    const ref = match[1];
    const result = resolveReference(ref, blocks);

    let type: InputSegment['type'];
    if (result.content === null) {
      type = 'error';
    } else if (result.warning) {
      type = 'ambiguous';
    } else {
      type = 'resolved';
    }

    segments.push({ text: match[0], type });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining plain text
  if (lastIndex < input.length) {
    segments.push({ text: input.slice(lastIndex), type: 'plain' });
  }

  return segments;
}
