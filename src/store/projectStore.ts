import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, Block, Stage, Selection } from '../types';

/** Create empty project state */
function createEmptyProject(title: string = 'Untitled Project', author: string = ''): Project {
  return {
    storyforge: '1.0',
    schema_version: 1,
    project: { title, author },
    settings: {
      llm_provider: '',
      default_reference_mode: 'summary',
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
    (set, get) => ({
  // Initial state
  project: createEmptyProject(),
  filePath: null,
  isDirty: false,
  selection: null,
  secondarySelection: null,

  // Project lifecycle
  newProject: (title, author = '') => {
    set({
      project: createEmptyProject(title, author),
      filePath: null,
      isDirty: false,
      selection: null,
      secondarySelection: null,
    });
  },

  loadProject: (project, filePath) => {
    set({
      project,
      filePath: filePath ?? null,
      isDirty: false,
      selection: null,
      secondarySelection: null,
    });
  },

  setDirty: (dirty) => set({ isDirty: dirty }),
  setFilePath: (path) => set({ filePath: path }),

  // Selection
  setSelection: (selection) => {
    set((state) => ({
      selection,
      project: {
        ...state.project,
        tree: {
          ...state.project.tree,
          selected: selection ? `${selection.category}:${selection.block}` : '',
        },
      },
    }));
  },

  setSecondarySelection: (selection) => {
    set({ secondarySelection: selection });
  },

  toggleCategory: (category) => {
    set((state) => {
      const expanded = state.project.tree.expanded_categories;
      const isExpanded = expanded.includes(category);
      return {
        project: {
          ...state.project,
          tree: {
            ...state.project.tree,
            expanded_categories: isExpanded
              ? expanded.filter((c) => c !== category)
              : [...expanded, category],
          },
        },
      };
    });
  },

  // Project metadata
  setTitle: (title) => {
    set((state) => ({
      project: {
        ...state.project,
        project: { ...state.project.project, title },
      },
      isDirty: true,
    }));
  },

  setAuthor: (author) => {
    set((state) => ({
      project: {
        ...state.project,
        project: { ...state.project.project, author },
      },
      isDirty: true,
    }));
  },

  // Category operations
  listCategories: () => Object.keys(get().project.blocks),

  createCategory: (category) => {
    set((state) => {
      if (state.project.blocks[category]) return state;
      return {
        project: {
          ...state.project,
          blocks: { ...state.project.blocks, [category]: {} },
        },
        isDirty: true,
      };
    });
  },

  deleteCategory: (category) => {
    set((state) => {
      const { [category]: _, ...rest } = state.project.blocks;
      return {
        project: { ...state.project, blocks: rest },
        isDirty: true,
        selection: state.selection?.category === category ? null : state.selection,
      };
    });
  },

  renameCategory: (oldName, newName) => {
    set((state) => {
      if (!state.project.blocks[oldName] || state.project.blocks[newName]) return state;

      const { [oldName]: categoryData, ...rest } = state.project.blocks;
      // Update expanded_categories if needed
      const expandedCategories = state.project.tree.expanded_categories.map((c) =>
        c === oldName ? newName : c
      );
      return {
        project: {
          ...state.project,
          blocks: { ...rest, [newName]: categoryData },
          tree: {
            ...state.project.tree,
            expanded_categories: expandedCategories,
            selected: state.project.tree.selected.startsWith(`${oldName}:`)
              ? state.project.tree.selected.replace(`${oldName}:`, `${newName}:`)
              : state.project.tree.selected,
          },
        },
        isDirty: true,
        selection:
          state.selection?.category === oldName
            ? { ...state.selection, category: newName }
            : state.selection,
      };
    });
  },

  reorderCategories: (fromIndex, toIndex) => {
    set((state) => {
      const categories = Object.keys(state.project.blocks);
      if (fromIndex < 0 || fromIndex >= categories.length || toIndex < 0 || toIndex >= categories.length) {
        return state;
      }

      // Remove the category from its current position
      const [movedCategory] = categories.splice(fromIndex, 1);
      // Insert it at the new position
      categories.splice(toIndex, 0, movedCategory);

      // Rebuild the blocks object with new order
      const reorderedBlocks: typeof state.project.blocks = {};
      for (const cat of categories) {
        reorderedBlocks[cat] = state.project.blocks[cat];
      }

      return {
        project: {
          ...state.project,
          blocks: reorderedBlocks,
        },
        isDirty: true,
      };
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
      const categoryBlocks = state.project.blocks[category] ?? {};
      if (categoryBlocks[name]) return state; // Block exists

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: { ...categoryBlocks, [name]: {} },
          },
        },
        isDirty: true,
      };
    });
  },

  deleteBlock: (category, name) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks?.[name]) return state;

      const { [name]: _, ...rest } = categoryBlocks;
      return {
        project: {
          ...state.project,
          blocks: { ...state.project.blocks, [category]: rest },
        },
        isDirty: true,
        selection:
          state.selection?.category === category && state.selection?.block === name
            ? null
            : state.selection,
      };
    });
  },

  renameBlock: (category, oldName, newName) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks?.[oldName] || categoryBlocks[newName]) return state;

      const { [oldName]: block, ...rest } = categoryBlocks;
      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: { ...rest, [newName]: block },
          },
        },
        isDirty: true,
        selection:
          state.selection?.category === category && state.selection?.block === oldName
            ? { ...state.selection, block: newName }
            : state.selection,
      };
    });
  },

  duplicateBlock: (category, name) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      const blockData = categoryBlocks?.[name];
      if (!blockData) return state;

      // Find a unique name: "name (copy)", "name (copy 2)", etc.
      let newName = `${name} (copy)`;
      let counter = 2;
      while (categoryBlocks[newName]) {
        newName = `${name} (copy ${counter})`;
        counter++;
      }

      // Deep clone the block data
      const clonedBlock = JSON.parse(JSON.stringify(blockData));

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: { ...categoryBlocks, [newName]: clonedBlock },
          },
        },
        isDirty: true,
      };
    });
  },

  reorderBlocks: (category, fromIndex, toIndex) => {
    set((state) => {
      const categoryBlocks = state.project.blocks[category];
      if (!categoryBlocks) return state;

      const blockNames = Object.keys(categoryBlocks);
      if (fromIndex < 0 || fromIndex >= blockNames.length || toIndex < 0 || toIndex >= blockNames.length) {
        return state;
      }

      // Remove the block from its current position
      const [movedBlock] = blockNames.splice(fromIndex, 1);
      // Insert it at the new position
      blockNames.splice(toIndex, 0, movedBlock);

      // Rebuild the category blocks object with new order
      const reorderedBlocks: typeof categoryBlocks = {};
      for (const blockName of blockNames) {
        reorderedBlocks[blockName] = categoryBlocks[blockName];
      }

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: reorderedBlocks,
          },
        },
        isDirty: true,
      };
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
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData || blockData[stage]) return state;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...blockData,
                [stage]: createEmptyStage(input),
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  updateStageInput: (category, block, stage, input) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData) return state;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: { ...stageData, input },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  deleteStage: (category, block, stage) => {
    set((state) => {
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData?.[stage]) return state;

      const { [stage]: _, ...rest } = blockData;
      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: rest,
            },
          },
        },
        isDirty: true,
      };
    });
  },

  renameStage: (category, block, oldName, newName) => {
    set((state) => {
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData?.[oldName] || blockData[newName]) return state;

      // Preserve order by rebuilding the object with the new key in the same position
      const newBlockData: typeof blockData = {};
      for (const key of Object.keys(blockData)) {
        if (key === oldName) {
          newBlockData[newName] = blockData[oldName];
        } else {
          newBlockData[key] = blockData[key];
        }
      }

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: newBlockData,
            },
          },
        },
        isDirty: true,
      };
    });
  },

  reorderStages: (category, block, fromIndex, toIndex) => {
    set((state) => {
      const blockData = state.project.blocks[category]?.[block];
      if (!blockData) return state;

      const stageKeys = Object.keys(blockData);
      if (fromIndex < 0 || fromIndex >= stageKeys.length || toIndex < 0 || toIndex >= stageKeys.length) {
        return state;
      }

      // Reorder keys
      const [movedKey] = stageKeys.splice(fromIndex, 1);
      stageKeys.splice(toIndex, 0, movedKey);

      // Rebuild object in new order
      const newBlockData: typeof blockData = {};
      for (const key of stageKeys) {
        newBlockData[key] = blockData[key];
      }

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: newBlockData,
            },
          },
        },
        isDirty: true,
      };
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
      if (!stageData) return state;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: {
                  ...stageData,
                  output: { ...stageData.output, [version]: content },
                },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  selectVersion: (category, block, stage, version) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData || stageData.output[version] === undefined) return state;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: { ...stageData, selected: version },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  deleteVersion: (category, block, stage, version) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData?.output[version]) return state;

      const { [version]: _, ...rest } = stageData.output;
      const newSelected = stageData.selected === version ? '' : stageData.selected;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: { ...stageData, output: rest, selected: newSelected },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  renameVersion: (category, block, stage, oldName, newName) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData?.output[oldName] || stageData.output[newName] !== undefined) return state;

      const { [oldName]: content, ...rest } = stageData.output;
      const newSelected = stageData.selected === oldName ? newName : stageData.selected;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: {
                  ...stageData,
                  output: { ...rest, [newName]: content },
                  selected: newSelected,
                },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  reorderVersions: (category, block, stage, fromIndex, toIndex) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData) return state;

      const versionKeys = Object.keys(stageData.output);
      if (fromIndex < 0 || fromIndex >= versionKeys.length || toIndex < 0 || toIndex >= versionKeys.length) {
        return state;
      }

      // Remove the version from its current position
      const [movedVersion] = versionKeys.splice(fromIndex, 1);
      // Insert it at the new position
      versionKeys.splice(toIndex, 0, movedVersion);

      // Rebuild the output object with new order
      const reorderedOutput: typeof stageData.output = {};
      for (const key of versionKeys) {
        reorderedOutput[key] = stageData.output[key];
      }

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: {
                  ...stageData,
                  output: reorderedOutput,
                },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  getSelectedOutput: (category, block, stage) => {
    const stageData = get().project.blocks[category]?.[block]?.[stage];
    if (!stageData?.selected) return undefined;
    return stageData.output[stageData.selected];
  },

  updateVersionContent: (category, block, stage, version, content) => {
    set((state) => {
      const stageData = state.project.blocks[category]?.[block]?.[stage];
      if (!stageData || stageData.output[version] === undefined) return state;

      return {
        project: {
          ...state.project,
          blocks: {
            ...state.project.blocks,
            [category]: {
              ...state.project.blocks[category],
              [block]: {
                ...state.project.blocks[category][block],
                [stage]: {
                  ...stageData,
                  output: { ...stageData.output, [version]: content },
                },
              },
            },
          },
        },
        isDirty: true,
      };
    });
  },

  getProjectForExport: () => {
    const state = get();
    // Return a clean copy without UI-only state
    return {
      storyforge: state.project.storyforge,
      schema_version: state.project.schema_version,
      project: state.project.project,
      settings: state.project.settings,
      blocks: state.project.blocks,
      tree: state.project.tree,
    };
  },
    }),
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
