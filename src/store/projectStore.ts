import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Project, Block, Stage, Selection } from '../types';
import { isValidName } from '../utils/nameValidation';
import { propagateBlockRename, propagateCategoryRename, transformAllInputs } from '../utils/referenceUtils';

/** Create empty project state */
function createEmptyProject(title: string = 'Untitled Project', author: string = ''): Project {
  return {
    storyforge: '1.0',
    schema_version: 1,
    project: { title, author },
    settings: {
      llm_provider: '',
    },
    blocks: {},
    tree: {
      expanded_categories: [],
      selected: '',
    },
  };
}

/** Create empty stage */
function createEmptyStage(input: string = ''): Stage {
  return {
    input,
    selected: '',
    output: {},
  };
}

/** Reorder keys of an object by moving one index to another. Returns a new plain object. */
function reorderKeys<T extends Record<string, unknown>>(obj: T, fromIndex: number, toIndex: number): T {
  const keys = Object.keys(obj);
  if (fromIndex < 0 || fromIndex >= keys.length || toIndex < 0 || toIndex >= keys.length) {
    return obj;
  }
  const [movedKey] = keys.splice(fromIndex, 1);
  keys.splice(toIndex, 0, movedKey);
  const reordered = {} as T;
  for (const key of keys) {
    (reordered as Record<string, unknown>)[key] = obj[key];
  }
  return reordered;
}

interface ProjectStore {
  // State
  project: Project;
  filePath: string | null;
  isDirty: boolean;
  selection: Selection | null;
  secondarySelection: Selection | null;

  // Project lifecycle
  newProject: (title: string, author?: string) => void;
  loadProject: (project: Project, filePath?: string) => void;
  setDirty: (dirty: boolean) => void;
  setFilePath: (path: string | null) => void;

  // Selection
  setSelection: (selection: Selection | null) => void;
  setSecondarySelection: (selection: Selection | null) => void;
  toggleCategory: (category: string) => void;

  // Project metadata
  setTitle: (title: string) => void;
  setAuthor: (author: string) => void;

  // Category operations
  listCategories: () => string[];
  createCategory: (category: string) => void;
  deleteCategory: (category: string) => void;
  renameCategory: (oldName: string, newName: string) => void;
  reorderCategories: (fromIndex: number, toIndex: number) => void;

  // Block operations
  listBlocks: (category: string) => string[];
  getBlock: (category: string, name: string) => Block | undefined;
  createBlock: (category: string, name: string) => void;
  deleteBlock: (category: string, name: string) => void;
  renameBlock: (category: string, oldName: string, newName: string) => void;
  duplicateBlock: (category: string, name: string) => void;
  reorderBlocks: (category: string, fromIndex: number, toIndex: number) => void;

  // Stage operations
  listStages: (category: string, block: string) => string[];
  getStage: (category: string, block: string, stage: string) => Stage | undefined;
  addStage: (category: string, block: string, stage: string, input?: string) => void;
  updateStageInput: (category: string, block: string, stage: string, input: string) => void;
  deleteStage: (category: string, block: string, stage: string) => void;
  renameStage: (category: string, block: string, oldName: string, newName: string) => void;
  reorderStages: (category: string, block: string, fromIndex: number, toIndex: number) => void;

  // Version operations
  listVersions: (category: string, block: string, stage: string) => string[];
  addVersion: (category: string, block: string, stage: string, version: string, content: string) => void;
  updateVersionContent: (category: string, block: string, stage: string, version: string, content: string) => void;
  selectVersion: (category: string, block: string, stage: string, version: string) => void;
  deleteVersion: (category: string, block: string, stage: string, version: string) => void;
  renameVersion: (category: string, block: string, stage: string, oldName: string, newName: string) => void;
  reorderVersions: (category: string, block: string, stage: string, fromIndex: number, toIndex: number) => void;
  getSelectedOutput: (category: string, block: string, stage: string) => string | undefined;

  // Export
  getProjectForExport: () => Project;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    immer(
      (set, get) => ({
  // Initial state
  project: createEmptyProject(),
  filePath: null,
  isDirty: false,
  selection: null,
  secondarySelection: null,

  // Project lifecycle
  newProject: (title, author = '') => {
    set((state) => {
      state.project = createEmptyProject(title, author);
      state.filePath = null;
      state.isDirty = false;
      state.selection = null;
      state.secondarySelection = null;
    });
  },

  loadProject: (project, filePath) => {
    set((state) => {
      state.project = project;
      state.filePath = filePath ?? null;
      state.isDirty = false;
      state.selection = null;
      state.secondarySelection = null;
    });
  },

  setDirty: (dirty) => set((state) => { state.isDirty = dirty; }),
  setFilePath: (path) => set((state) => { state.filePath = path; }),

  // Selection
  setSelection: (selection) => {
    set((state) => {
      state.selection = selection;
      state.project.tree.selected = selection ? `${selection.category}:${selection.block}` : '';
    });
  },

  setSecondarySelection: (selection) => {
    set((state) => { state.secondarySelection = selection; });
  },

  toggleCategory: (category) => {
    set((state) => {
      const expanded = state.project.tree.expanded_categories;
      const idx = expanded.indexOf(category);
      if (idx >= 0) {
        expanded.splice(idx, 1);
      } else {
        expanded.push(category);
      }
    });
  },

  // Project metadata
  setTitle: (title) => {
    set((state) => {
      state.project.project.title = title;
      state.isDirty = true;
    });
  },

  setAuthor: (author) => {
    set((state) => {
      state.project.project.author = author;
      state.isDirty = true;
    });
  },

  // Category operations
  listCategories: () => Object.keys(get().project.blocks),

  createCategory: (category) => {
    set((state) => {
      if (!isValidName(category)) return;
      if (state.project.blocks[category]) return;
      state.project.blocks[category] = {};
      state.isDirty = true;
    });
  },

  deleteCategory: (category) => {
    set((state) => {
      delete state.project.blocks[category];
      state.isDirty = true;
      if (state.selection?.category === category) state.selection = null;
    });
  },

  renameCategory: (oldName, newName) => {
    set((state) => {
      if (!isValidName(newName)) return;
      if (!state.project.blocks[oldName] || state.project.blocks[newName]) return;

      // Rename key: copy data, delete old, add new
      const categoryData = state.project.blocks[oldName];
      delete state.project.blocks[oldName];
      state.project.blocks[newName] = categoryData;

      // Propagate references (needs plain object for regex transforms)
      const plainBlocks = JSON.parse(JSON.stringify(state.project.blocks));
      state.project.blocks = transformAllInputs(plainBlocks, (input) =>
        propagateCategoryRename(input, oldName, newName)
      );

      // Update expanded categories
      const expanded = state.project.tree.expanded_categories;
      const idx = expanded.indexOf(oldName);
      if (idx >= 0) expanded[idx] = newName;

      // Update tree selection string
      if (state.project.tree.selected.startsWith(`${oldName}:`)) {
        state.project.tree.selected = state.project.tree.selected.replace(`${oldName}:`, `${newName}:`);
      }

      state.isDirty = true;
      if (state.selection?.category === oldName) {
        state.selection = { ...state.selection, category: newName };
      }
    });
  },

  reorderCategories: (fromIndex, toIndex) => {
    set((state) => {
      state.project.blocks = reorderKeys(state.project.blocks, fromIndex, toIndex);
      state.isDirty = true;
    });
  },

  // Block operations
  listBlocks: (category) => {
    const blocks = get().project.blocks[category];
    return blocks ? Object.keys(blocks) : [];
  },

  getBlock: (category, name) => {
    return get().project.blocks[category]?.[name];
  },

  createBlock: (category, name) => {
    set((state) => {
      if (!isValidName(name)) return;
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks || categoryBlocks[name]) return;
      categoryBlocks[name] = {};
      state.isDirty = true;
    });
  },

  deleteBlock: (category, name) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks?.[name]) return;
      delete categoryBlocks[name];
      state.isDirty = true;
      if (state.selection?.category === category && state.selection?.block === name) {
        state.selection = null;
      }
    });
  },

  renameBlock: (category, oldName, newName) => {
    set((state) => {
      if (!isValidName(newName)) return;
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks?.[oldName] || categoryBlocks[newName]) return;

      // Rename key within category
      const blockData = categoryBlocks[oldName];
      delete categoryBlocks[oldName];
      categoryBlocks[newName] = blockData;

      // Propagate references (needs plain object for regex transforms)
      const plainBlocks = JSON.parse(JSON.stringify(state.project.blocks));
      state.project.blocks = transformAllInputs(plainBlocks, (input) =>
        propagateBlockRename(input, category, oldName, newName)
      );

      state.isDirty = true;
      if (state.selection?.category === category && state.selection?.block === oldName) {
        state.selection = { ...state.selection, block: newName };
      }
    });
  },

  duplicateBlock: (category, name) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      const blockData = categoryBlocks?.[name];
      if (!blockData) return;

      let newName = `${name}_copy`;
      let counter = 2;
      while (categoryBlocks[newName]) {
        newName = `${name}_copy_${counter}`;
        counter++;
      }

      categoryBlocks[newName] = JSON.parse(JSON.stringify(blockData));
      state.isDirty = true;
    });
  },

  reorderBlocks: (category, fromIndex, toIndex) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks) return;
      state.project.blocks[category] = reorderKeys(categoryBlocks, fromIndex, toIndex);
      state.isDirty = true;
    });
  },

  // Stage operations
  listStages: (category, block) => {
    const blockData = get().project.blocks[category]?.[block];
    return blockData ? Object.keys(blockData) : [];
  },

  getStage: (category, block, stage) => {
    return get().project.blocks[category]?.[block]?.[stage];
  },

  addStage: (category, block, stage, input = '') => {
    set((state) => {
      if (!isValidName(stage)) return;
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData || blockData[stage]) return;
      blockData[stage] = createEmptyStage(input);
      state.isDirty = true;
    });
  },

  updateStageInput: (category, block, stage, input) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData) return;
      stageData.input = input;
      state.isDirty = true;
    });
  },

  deleteStage: (category, block, stage) => {
    set((state) => {
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData?.[stage]) return;
      delete blockData[stage];
      state.isDirty = true;
    });
  },

  renameStage: (category, block, oldName, newName) => {
    set((state) => {
      if (!isValidName(newName)) return;
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData?.[oldName] || blockData[newName]) return;

      // Rebuild to preserve key order
      const newBlockData: Block = {};
      for (const key of Object.keys(blockData)) {
        newBlockData[key === oldName ? newName : key] = blockData[key];
      }
      state.project.blocks[category][block] = newBlockData;
      state.isDirty = true;
    });
  },

  reorderStages: (category, block, fromIndex, toIndex) => {
    set((state) => {
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData) return;
      state.project.blocks[category][block] = reorderKeys(blockData, fromIndex, toIndex);
      state.isDirty = true;
    });
  },

  // Version operations
  listVersions: (category, block, stage) => {
    const stageData = get().project.blocks[category]?.[block]?.[stage];
    return stageData ? Object.keys(stageData.output) : [];
  },

  addVersion: (category, block, stage, version, content) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData) return;
      stageData.output[version] = content;
      state.isDirty = true;
    });
  },

  updateVersionContent: (category, block, stage, version, content) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData || stageData.output[version] === undefined) return;
      stageData.output[version] = content;
      state.isDirty = true;
    });
  },

  selectVersion: (category, block, stage, version) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData || stageData.output[version] === undefined) return;
      stageData.selected = version;
      state.isDirty = true;
    });
  },

  deleteVersion: (category, block, stage, version) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData?.output[version]) return;
      delete stageData.output[version];
      if (stageData.selected === version) stageData.selected = '';
      state.isDirty = true;
    });
  },

  renameVersion: (category, block, stage, oldName, newName) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData?.output[oldName] || stageData.output[newName] !== undefined) return;

      const content = stageData.output[oldName];
      delete stageData.output[oldName];
      stageData.output[newName] = content;
      if (stageData.selected === oldName) stageData.selected = newName;
      state.isDirty = true;
    });
  },

  reorderVersions: (category, block, stage, fromIndex, toIndex) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData) return;
      stageData.output = reorderKeys(stageData.output, fromIndex, toIndex);
      state.isDirty = true;
    });
  },

  getSelectedOutput: (category, block, stage) => {
    const stageData = get().project.blocks[category]?.[block]?.[stage];
    if (!stageData?.selected) return undefined;
    return stageData.output[stageData.selected];
  },

  getProjectForExport: () => {
    return get().project;
  },
      })
    ),
    {
      name: 'storyforge-project',
      partialize: (state) => ({
        project: state.project,
        filePath: state.filePath,
        // Don't persist isDirty, selection, secondarySelection - they're UI state
      }),
    }
  )
);
