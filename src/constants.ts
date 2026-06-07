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

/**
 * Build the next auto-generated version key (e.g. `v3`).
 *
 * Accepts the existing version keys and returns a key one greater than the
 * highest numeric suffix found. Deriving from the actual keys (rather than the
 * count) prevents collisions that would overwrite an existing version after
 * earlier versions have been deleted.
 */
export function nextVersionKey(existingVersions: readonly string[]): string {
  let max = 0;
  for (const version of existingVersions) {
    if (!version.startsWith(VERSION_PREFIX)) continue;
    const num = Number(version.slice(VERSION_PREFIX.length));
    if (Number.isInteger(num) && num > max) max = num;
  }
  return `${VERSION_PREFIX}${max + 1}`;
}

