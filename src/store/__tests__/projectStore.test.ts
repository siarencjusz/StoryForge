import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '../projectStore';

/** Reset store to a clean empty state before each test */
function resetStore() {
  const { newProject } = useProjectStore.getState();
  newProject('Test', '');
}

/** Seed a category/block/stage/version for tests that need existing data */
function seedBlock() {
  const s = useProjectStore.getState();
  s.createCategory('characters');
  s.createBlock('characters', 'alice');
  s.addStage('characters', 'alice', 'raw', 'hello [bob]');
  s.addVersion('characters', 'alice', 'raw', 'v1', 'Alice output');
  s.selectVersion('characters', 'alice', 'raw', 'v1');
  // Reset dirty flag so tests start clean
  useProjectStore.setState({ isDirty: false });
}

describe('projectStore', () => {
  beforeEach(resetStore);

  // -----------------------------------------------------------------------
  // Project lifecycle
  // -----------------------------------------------------------------------

  describe('newProject', () => {
    it('creates an empty project with given title', () => {
      const s = useProjectStore.getState();
      s.newProject('My Story', 'Author');
      const { project } = useProjectStore.getState();
      expect(project.project.title).toBe('My Story');
      expect(project.project.author).toBe('Author');
      expect(project.blocks).toEqual({});
    });
  });

  describe('loadProject', () => {
    it('replaces project state and resets selection', () => {
      const s = useProjectStore.getState();
      s.createCategory('x');
      s.setSelection({ category: 'x', block: 'y' });

      const newProj = {
        storyforge: '1.0',
        schema_version: 1,
        project: { title: 'Loaded', author: '' },
        settings: { llm_provider: '' },
        blocks: { cats: { meow: {} } },
        tree: { expanded_categories: [], selected: '' },
      };
      s.loadProject(newProj);

      const state = useProjectStore.getState();
      expect(state.project.project.title).toBe('Loaded');
      expect(state.selection).toBeNull();
      expect(state.isDirty).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Category operations
  // -----------------------------------------------------------------------

  describe('category operations', () => {
    it('creates a category', () => {
      useProjectStore.getState().createCategory('places');
      expect(useProjectStore.getState().listCategories()).toContain('places');
      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('rejects invalid category name', () => {
      useProjectStore.getState().createCategory('bad name');
      expect(useProjectStore.getState().listCategories()).not.toContain('bad name');
    });

    it('rejects duplicate category', () => {
      const s = useProjectStore.getState();
      s.createCategory('places');
      s.createCategory('places');
      expect(useProjectStore.getState().listCategories().filter(c => c === 'places')).toHaveLength(1);
    });

    it('deletes a category', () => {
      const s = useProjectStore.getState();
      s.createCategory('places');
      s.deleteCategory('places');
      expect(useProjectStore.getState().listCategories()).not.toContain('places');
    });

    it('clears selection when deleting selected category', () => {
      const s = useProjectStore.getState();
      s.createCategory('places');
      s.createBlock('places', 'forest');
      s.setSelection({ category: 'places', block: 'forest' });
      s.deleteCategory('places');
      expect(useProjectStore.getState().selection).toBeNull();
    });

    it('renames a category and updates expanded list', () => {
      const s = useProjectStore.getState();
      s.createCategory('chars');
      s.toggleCategory('chars');
      s.renameCategory('chars', 'characters');
      const state = useProjectStore.getState();
      expect(state.listCategories()).toContain('characters');
      expect(state.listCategories()).not.toContain('chars');
      expect(state.project.tree.expanded_categories).toContain('characters');
    });

    it('reorders categories', () => {
      const s = useProjectStore.getState();
      s.createCategory('a');
      s.createCategory('b');
      s.createCategory('c');
      s.reorderCategories(0, 2);
      expect(useProjectStore.getState().listCategories()).toEqual(['b', 'c', 'a']);
    });
  });

  // -----------------------------------------------------------------------
  // Block operations
  // -----------------------------------------------------------------------

  describe('block operations', () => {
    beforeEach(() => {
      useProjectStore.getState().createCategory('characters');
    });

    it('creates a block', () => {
      useProjectStore.getState().createBlock('characters', 'alice');
      expect(useProjectStore.getState().listBlocks('characters')).toContain('alice');
    });

    it('rejects invalid block name', () => {
      useProjectStore.getState().createBlock('characters', '1bad');
      expect(useProjectStore.getState().listBlocks('characters')).not.toContain('1bad');
    });

    it('deletes a block', () => {
      const s = useProjectStore.getState();
      s.createBlock('characters', 'alice');
      s.deleteBlock('characters', 'alice');
      expect(useProjectStore.getState().listBlocks('characters')).not.toContain('alice');
    });

    it('renames a block', () => {
      const s = useProjectStore.getState();
      s.createBlock('characters', 'alice');
      s.renameBlock('characters', 'alice', 'alice_v2');
      const blocks = useProjectStore.getState().listBlocks('characters');
      expect(blocks).toContain('alice_v2');
      expect(blocks).not.toContain('alice');
    });

    it('duplicates a block with deep-cloned data', () => {
      const s = useProjectStore.getState();
      s.createBlock('characters', 'alice');
      s.addStage('characters', 'alice', 'raw', 'prompt');
      s.addVersion('characters', 'alice', 'raw', 'v1', 'output');
      s.duplicateBlock('characters', 'alice');
      const blocks = useProjectStore.getState().listBlocks('characters');
      expect(blocks).toContain('alice_copy');
      // Verify deep clone — modifying copy doesn't affect original
      const orig = useProjectStore.getState().getBlock('characters', 'alice');
      const copy = useProjectStore.getState().getBlock('characters', 'alice_copy');
      expect(copy?.raw.output.v1).toBe('output');
      expect(orig?.raw.output.v1).toBe('output');
    });

    it('reorders blocks', () => {
      const s = useProjectStore.getState();
      s.createBlock('characters', 'alice');
      s.createBlock('characters', 'bob');
      s.createBlock('characters', 'carol');
      s.reorderBlocks('characters', 0, 2);
      expect(useProjectStore.getState().listBlocks('characters')).toEqual(['bob', 'carol', 'alice']);
    });
  });

  // -----------------------------------------------------------------------
  // Stage operations
  // -----------------------------------------------------------------------

  describe('stage operations', () => {
    beforeEach(seedBlock);

    it('lists stages', () => {
      expect(useProjectStore.getState().listStages('characters', 'alice')).toEqual(['raw']);
    });

    it('gets a stage', () => {
      const stage = useProjectStore.getState().getStage('characters', 'alice', 'raw');
      expect(stage).toBeDefined();
      expect(stage?.input).toBe('hello [bob]');
    });

    it('adds a stage with input', () => {
      useProjectStore.getState().addStage('characters', 'alice', 'refined', 'new prompt');
      const stage = useProjectStore.getState().getStage('characters', 'alice', 'refined');
      expect(stage?.input).toBe('new prompt');
      expect(stage?.output).toEqual({});
    });

    it('rejects duplicate stage name', () => {
      useProjectStore.getState().addStage('characters', 'alice', 'raw', 'dup');
      expect(useProjectStore.getState().listStages('characters', 'alice')).toEqual(['raw']);
    });

    it('updates stage input', () => {
      useProjectStore.getState().updateStageInput('characters', 'alice', 'raw', 'updated');
      expect(useProjectStore.getState().getStage('characters', 'alice', 'raw')?.input).toBe('updated');
      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('deletes a stage', () => {
      useProjectStore.getState().deleteStage('characters', 'alice', 'raw');
      expect(useProjectStore.getState().listStages('characters', 'alice')).toEqual([]);
    });

    it('renames a stage preserving order', () => {
      const s = useProjectStore.getState();
      s.addStage('characters', 'alice', 'refined', '');
      s.renameStage('characters', 'alice', 'raw', 'base');
      expect(useProjectStore.getState().listStages('characters', 'alice')).toEqual(['base', 'refined']);
    });

    it('reorders stages', () => {
      const s = useProjectStore.getState();
      s.addStage('characters', 'alice', 'refined', '');
      s.addStage('characters', 'alice', 'final', '');
      s.reorderStages('characters', 'alice', 0, 2);
      expect(useProjectStore.getState().listStages('characters', 'alice')).toEqual(['refined', 'final', 'raw']);
    });
  });

  // -----------------------------------------------------------------------
  // Version operations
  // -----------------------------------------------------------------------

  describe('version operations', () => {
    beforeEach(seedBlock);

    it('lists versions', () => {
      expect(useProjectStore.getState().listVersions('characters', 'alice', 'raw')).toEqual(['v1']);
    });

    it('adds a version', () => {
      useProjectStore.getState().addVersion('characters', 'alice', 'raw', 'v2', 'second');
      expect(useProjectStore.getState().listVersions('characters', 'alice', 'raw')).toEqual(['v1', 'v2']);
    });

    it('updates version content', () => {
      useProjectStore.getState().updateVersionContent('characters', 'alice', 'raw', 'v1', 'new content');
      const stage = useProjectStore.getState().getStage('characters', 'alice', 'raw');
      expect(stage?.output.v1).toBe('new content');
      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('selects a version', () => {
      useProjectStore.getState().addVersion('characters', 'alice', 'raw', 'v2', 'second');
      useProjectStore.getState().selectVersion('characters', 'alice', 'raw', 'v2');
      expect(useProjectStore.getState().getStage('characters', 'alice', 'raw')?.selected).toBe('v2');
    });

    it('refuses to select nonexistent version', () => {
      useProjectStore.getState().selectVersion('characters', 'alice', 'raw', 'v999');
      expect(useProjectStore.getState().getStage('characters', 'alice', 'raw')?.selected).toBe('v1');
    });

    it('deletes a version and clears selection if needed', () => {
      useProjectStore.getState().deleteVersion('characters', 'alice', 'raw', 'v1');
      const stage = useProjectStore.getState().getStage('characters', 'alice', 'raw');
      expect(stage?.output).toEqual({});
      expect(stage?.selected).toBe('');
    });

    it('renames a version and updates selection', () => {
      useProjectStore.getState().renameVersion('characters', 'alice', 'raw', 'v1', 'draft1');
      const stage = useProjectStore.getState().getStage('characters', 'alice', 'raw');
      expect(Object.keys(stage!.output)).toEqual(['draft1']);
      expect(stage?.selected).toBe('draft1');
    });

    it('reorders versions', () => {
      const s = useProjectStore.getState();
      s.addVersion('characters', 'alice', 'raw', 'v2', 'two');
      s.addVersion('characters', 'alice', 'raw', 'v3', 'three');
      s.reorderVersions('characters', 'alice', 'raw', 0, 2);
      expect(useProjectStore.getState().listVersions('characters', 'alice', 'raw')).toEqual(['v2', 'v3', 'v1']);
    });

    it('getSelectedOutput returns content of selected version', () => {
      expect(useProjectStore.getState().getSelectedOutput('characters', 'alice', 'raw')).toBe('Alice output');
    });

    it('getSelectedOutput returns undefined when nothing selected', () => {
      useProjectStore.getState().addStage('characters', 'alice', 'empty', '');
      expect(useProjectStore.getState().getSelectedOutput('characters', 'alice', 'empty')).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Selection
  // -----------------------------------------------------------------------

  describe('selection', () => {
    it('sets and clears selection', () => {
      const s = useProjectStore.getState();
      s.setSelection({ category: 'a', block: 'b' });
      expect(useProjectStore.getState().selection).toEqual({ category: 'a', block: 'b' });
      expect(useProjectStore.getState().project.tree.selected).toBe('a:b');

      s.setSelection(null);
      expect(useProjectStore.getState().selection).toBeNull();
      expect(useProjectStore.getState().project.tree.selected).toBe('');
    });

    it('sets secondary selection', () => {
      const s = useProjectStore.getState();
      s.setSecondarySelection({ category: 'x', block: 'y' });
      expect(useProjectStore.getState().secondarySelection).toEqual({ category: 'x', block: 'y' });
    });

    it('toggles category expansion', () => {
      const s = useProjectStore.getState();
      s.createCategory('chars');
      s.toggleCategory('chars');
      expect(useProjectStore.getState().project.tree.expanded_categories).toContain('chars');
      s.toggleCategory('chars');
      expect(useProjectStore.getState().project.tree.expanded_categories).not.toContain('chars');
    });
  });

  // -----------------------------------------------------------------------
  // Metadata
  // -----------------------------------------------------------------------

  describe('metadata', () => {
    it('sets title and marks dirty', () => {
      useProjectStore.getState().setTitle('New Title');
      expect(useProjectStore.getState().project.project.title).toBe('New Title');
      expect(useProjectStore.getState().isDirty).toBe(true);
    });

    it('sets author and marks dirty', () => {
      useProjectStore.getState().setAuthor('New Author');
      expect(useProjectStore.getState().project.project.author).toBe('New Author');
      expect(useProjectStore.getState().isDirty).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Export
  // -----------------------------------------------------------------------

  describe('getProjectForExport', () => {
    it('returns a Project object with all expected keys', () => {
      seedBlock();
      const exported = useProjectStore.getState().getProjectForExport();
      expect(exported).toHaveProperty('storyforge');
      expect(exported).toHaveProperty('schema_version');
      expect(exported).toHaveProperty('project');
      expect(exported).toHaveProperty('settings');
      expect(exported).toHaveProperty('blocks');
      expect(exported).toHaveProperty('tree');
      expect(exported.blocks.characters.alice.raw.output.v1).toBe('Alice output');
    });
  });
});

