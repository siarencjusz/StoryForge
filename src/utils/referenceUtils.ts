/**
 * Reference resolution utilities
 * Resolves [category:block] and [category:block:stage] references in input text
 */

import type { Block, Blocks } from '../types';
import { DEFAULT_STAGE_PRIORITY } from '../constants';

// Pattern to match references like [block], [category:block], or [category:block:stage]
export const REFERENCE_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]/g;

/** Parsed reference — result of splitting a `category:block:stage` string */
export interface ParsedRef {
  category?: string;
  block: string;
  stage?: string;
}

/**
 * Parse a reference string into its component parts.
 * Returns `null` for invalid formats (more than 3 colon-separated parts).
 *
 * - `"block"`              → `{ block }`
 * - `"category:block"`     → `{ category, block }`
 * - `"category:block:stage"` → `{ category, block, stage }`
 */
export function parseRef(ref: string): ParsedRef | null {
  const parts = ref.split(':');
  if (parts.length === 1) return { block: parts[0] };
  if (parts.length === 2) return { category: parts[0], block: parts[1] };
  if (parts.length === 3) return { category: parts[0], block: parts[1], stage: parts[2] };
  return null;
}

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

  // Otherwise, try to find default stage using priority list
  const stageNames = Object.keys(blockData);
  const targetStage = DEFAULT_STAGE_PRIORITY.find(s => stageNames.includes(s)) ?? stageNames[0];

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
  const parsed = parseRef(ref);
  if (!parsed) return { content: null, error: `Invalid reference format: '${ref}'` };

  if (!parsed.category) {
    // Just block name - search all categories
    const found = findBlockAcrossCategories(blocks, parsed.block);
    if (!found) {
      return { content: null, error: `Block '${parsed.block}' not found` };
    }
    const content = getBlockOutput(blocks, found.category, found.block);
    if (content === null) {
      return { content: null, error: `Block '${parsed.block}' has no selected output` };
    }
    // Warn if the block exists in multiple categories
    if (found.allCategories.length > 1) {
      return {
        content,
        warning: `Ambiguous: [${parsed.block}] exists in categories: ${found.allCategories.join(', ')}. Using '${found.allCategories[0]}'. Qualify as [category:${parsed.block}] to be explicit.`,
      };
    }
    return { content };
  }

  // Qualified reference (2-part or 3-part)
  const content = getBlockOutput(blocks, parsed.category, parsed.block, parsed.stage);
  if (content === null) {
    if (parsed.stage) {
      return { content: null, error: `Reference '${ref}' not found or has no selected output` };
    }
    const catExists = blocks[parsed.category];
    if (!catExists) {
      return { content: null, error: `Category '${parsed.category}' not found` };
    }
    const blockExists = catExists[parsed.block];
    if (!blockExists) {
      return { content: null, error: `Block '${parsed.category}:${parsed.block}' not found` };
    }
    return { content: null, error: `Block '${parsed.category}:${parsed.block}' has no selected output` };
  }
  return { content };
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
    const parsed = parseRef(ref);
    if (!parsed || parsed.block !== oldBlockName) return match;
    // If qualified, category must match
    if (parsed.category && parsed.category !== category) return match;

    if (!parsed.category) return `[${newBlockName}]`;
    if (parsed.stage) return `[${parsed.category}:${newBlockName}:${parsed.stage}]`;
    return `[${parsed.category}:${newBlockName}]`;
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
    const parsed = parseRef(ref);
    if (!parsed || !parsed.category || parsed.category !== oldCategoryName) return match;

    if (parsed.stage) return `[${newCategoryName}:${parsed.block}:${parsed.stage}]`;
    return `[${newCategoryName}:${parsed.block}]`;
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
 * Remove all reference brackets from text, leaving only the non-reference content.
 */
export function stripReferences(text: string): string {
  return text.replace(REFERENCE_PATTERN, '');
}

/**
 * Check whether a reference string resolves to a valid target in blocks.
 */
export function isReferenceValid(ref: string, blocks: Blocks): boolean {
  const parsed = parseRef(ref);
  if (!parsed) return false;

  if (!parsed.category) {
    return findBlockAcrossCategories(blocks, parsed.block) !== null;
  }
  if (parsed.stage) {
    return !!(blocks[parsed.category]?.[parsed.block]?.[parsed.stage]);
  }
  return !!(blocks[parsed.category]?.[parsed.block]);
}

/**
 * Get the selected output content for a reference string.
 * Handles 1-part (`[block]`), 2-part (`[cat:block]`), and 3-part (`[cat:block:stage]`) formats.
 */
export function getReferenceOutput(ref: string, blocks: Blocks): string | null {
  const parsed = parseRef(ref);
  if (!parsed) return null;

  if (!parsed.category) {
    const found = findBlockAcrossCategories(blocks, parsed.block);
    if (!found) return null;
    return getBlockOutput(blocks, found.category, found.block);
  }
  return getBlockOutput(blocks, parsed.category, parsed.block, parsed.stage);
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
  const parsed = parseRef(ref);
  if (!parsed) return false;

  if (!parsed.category) {
    return parsed.block === targetBlock;
  }
  return parsed.category === targetCategory && parsed.block === targetBlock;
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
