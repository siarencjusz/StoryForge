/**
 * Tutorial Hints System
 * Shows helpful hints when hovering over UI elements
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface HintsStore {
  showHints: boolean;
  setShowHints: (show: boolean) => void;
}

export const useHintsStore = create<HintsStore>()(
  persist(
    (set) => ({
      showHints: true, // Enabled by default for new users
      setShowHints: (show) => set({ showHints: show }),
    }),
    {
      name: 'storyforge-hints',
    }
  )
);

/** Tutorial hints for various UI elements */
export const HINTS: Record<string, string> = {
  // Header buttons
  'btn-new': 'Create a new project. Your current work is saved in the browser automatically.',
  'btn-open': 'Open a YAML project file from your computer.',
  'btn-save': 'Save the project to the current file. If no file exists, you\'ll be asked to choose a location.',
  'btn-save-as': 'Save the project to a new file location.',
  'btn-llm-status': 'Click to configure LLM settings. The colored dot shows connection status: green = connected, red = error, gray = not tested.',

  // Tree panel
  'tree-category': 'Click to expand/collapse. Right-click for options. Categories organize your blocks (characters, locations, scenes, etc.).',
  'tree-block': 'Click to select and edit. Shift+Click to open in compare panel. Double-click to rename.',
  'tree-add-category': 'Add a new category to organize your blocks.',
  'tree-add-block': 'Add a new block to this category.',
  'tree-duplicate': 'Create a copy of this block with all its content.',
  'tree-delete': 'Delete this block permanently.',

  // Editor panel
  'editor-stage-tab': 'Stages are processing steps for a block. Click to switch, double-click to rename, drag to reorder.',
  'editor-add-stage': 'Add a new stage to this block. Stages let you build complex prompts step by step.',
  'editor-input': 'Write your prompt here. Use [block_name] or [category:block] to reference other blocks\' outputs.',
  'editor-generate-new': 'Send the input to the LLM and create a new output version.',
  'editor-regenerate': 'Replace the current version with a new generation.',
  'editor-continue': 'Continue generating from where the current output ends.',
  'editor-stop': 'Stop the current generation. Content generated so far is kept.',
  'editor-version-tab': 'Output versions. Click to select, Shift+Click to compare two versions side by side.',
  'editor-add-version': 'Add a new empty version to edit manually.',
  'editor-delete-version': 'Delete the currently selected version.',
  'editor-token-count': 'Estimated token count. Shows breakdown: base text + each referenced block\'s contribution.',

  // Dependency panel
  'dep-uses': 'Blocks referenced by this block\'s input. Click to navigate to that block.',
  'dep-used-by': 'Blocks that reference this block. Helps you understand dependencies.',

  // General
  'hint-checkbox': 'Toggle tutorial hints on/off. Hints appear when you hover over elements for 2 seconds.',
};
