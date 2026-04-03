/**
 * Shared magic-string constants used across StoryForge.
 *
 * Centralised here so renames only need one edit.
 */

// ---------------------------------------------------------------------------
// Stage resolution priority
// ---------------------------------------------------------------------------

/**
 * When a reference like `[block]` or `[category:block]` omits the stage,
 * these names are checked in order. The first match wins; if none match
 * the first stage in insertion order is used.
 */
export const DEFAULT_STAGE_PRIORITY = ['output', 'raw'] as const;

// ---------------------------------------------------------------------------
// Default names
// ---------------------------------------------------------------------------

/** Name given to the first stage created via the "Add a stage" button. */
export const DEFAULT_STAGE_NAME = 'main';

/** Prefix for auto-generated version keys (`v1`, `v2`, …). */
export const VERSION_PREFIX = 'v';

/** Build the next auto-generated version key (e.g. `v3`). */
export function nextVersionKey(currentCount: number): string {
  return `${VERSION_PREFIX}${currentCount + 1}`;
}

