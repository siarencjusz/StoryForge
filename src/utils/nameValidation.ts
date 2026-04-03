/**
 * Name validation utilities for block, category, and stage names.
 *
 * Names must be identifier-safe so they can be used reliably in
 * [block], [category:block], and [category:block:stage] references.
 *
 * Valid pattern: starts with a letter or underscore, followed by
 * letters, digits, or underscores.  e.g.  alice, dark_forest, _tmp, scene2
 */

/** Regex pattern that a valid name must match in its entirety. */
export const NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Maximum allowed name length */
export const MAX_NAME_LENGTH = 64;

/**
 * Check whether a name is valid for use as a category, block, or stage key.
 */
export function isValidName(name: string): boolean {
  return (
    name.length > 0 &&
    name.length <= MAX_NAME_LENGTH &&
    NAME_PATTERN.test(name)
  );
}

/**
 * Validate a name and return a human-readable error message if invalid.
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  if (name.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Name cannot exceed ${MAX_NAME_LENGTH} characters` };
  }

  if (!/^[a-zA-Z_]/.test(name)) {
    return { valid: false, error: 'Name must start with a letter or underscore' };
  }

  if (!NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error: 'Name can only contain letters, digits, and underscores',
    };
  }

  return { valid: true };
}

/**
 * Suggest a sanitized version of an invalid name.
 * Replaces disallowed characters with underscores, ensures it starts correctly,
 * and trims to max length.  Returns null if no reasonable name can be derived.
 */
export function sanitizeName(raw: string): string | null {
  // Replace disallowed characters with underscores
  let sanitized = raw.replace(/[^a-zA-Z0-9_]/g, '_');

  // Ensure starts with a letter or underscore (not a digit)
  if (/^[0-9]/.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // Collapse consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Trim trailing underscores
  sanitized = sanitized.replace(/_+$/, '');

  // Enforce max length
  sanitized = sanitized.slice(0, MAX_NAME_LENGTH);

  // Final validation
  if (!sanitized || !NAME_PATTERN.test(sanitized)) {
    return null;
  }

  return sanitized;
}

