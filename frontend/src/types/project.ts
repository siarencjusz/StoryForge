/**
 * StoryForge Type Definitions
 *
 * These types mirror the YAML schema defined in schema_v1.md
 */

/** Version output - maps version key to content */
export type VersionOutput = Record<string, string>;

/** Stage within a block */
export interface Stage {
  input: string;
  selected: string;
  output: VersionOutput;
}

/** Block - a dictionary of stages */
export type Block = Record<string, Stage>;

/** Category - a dictionary of blocks */
export type Category = Record<string, Block>;

/** All blocks organized by category */
export type Blocks = Record<string, Category>;

/** Project metadata */
export interface ProjectMeta {
  title: string;
  author: string;
}

/** Project settings */
export interface ProjectSettings {
  llm_provider: string;
  default_reference_mode: 'summary' | 'full';
}

/** Tree UI state */
export interface TreeState {
  expanded_categories: string[];
  selected: string;  // "category:block" or ""
}

/** Complete project structure */
export interface Project {
  storyforge: string;
  schema_version: number;
  project: ProjectMeta;
  settings: ProjectSettings;
  blocks: Blocks;
  tree: TreeState;
}

/** Reference info for dependency tracking */
export interface ReferenceInfo {
  category: string;
  block: string;
  stage?: string;
}

/** Dependency info for a block */
export interface Dependencies {
  uses: ReferenceInfo[];      // References this block uses
  usedBy: ReferenceInfo[];    // Blocks that reference this block
}

/** Selection state in the UI */
export interface Selection {
  category: string;
  block: string;
  stage?: string;
}

/** API response types */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
