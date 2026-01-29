import { ChevronRight, ChevronDown, Folder, FileText, Plus, PanelRight, Copy, X, GripVertical } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useState, type DragEvent } from 'react';

export function TreePanel() {
  const {
    project,
    selection,
    secondarySelection,
    setSelection,
    setSecondarySelection,
    toggleCategory,
    createCategory,
    deleteCategory,
    createBlock,
    deleteBlock,
    listCategories,
    listBlocks,
    renameCategory,
    renameBlock,
    duplicateBlock,
    reorderCategories,
    reorderBlocks,
  } = useProjectStore();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newBlockCategory, setNewBlockCategory] = useState<string | null>(null);
  const [newBlockName, setNewBlockName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingBlock, setEditingBlock] = useState<{ category: string; block: string } | null>(null);
  const [editingBlockName, setEditingBlockName] = useState('');

  // Drag and drop state
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [draggedBlock, setDraggedBlock] = useState<{ category: string; block: string } | null>(null);
  const [dropTargetCategory, setDropTargetCategory] = useState<string | null>(null);
  const [dropTargetBlock, setDropTargetBlock] = useState<{ category: string; block: string } | null>(null);

  const categories = listCategories();
  const expandedCategories = project.tree.expanded_categories;

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setShowNewCategory(false);
    }
  };

  const handleCreateBlock = (category: string) => {
    if (newBlockName.trim()) {
      createBlock(category, newBlockName.trim());
      setNewBlockName('');
      setNewBlockCategory(null);
    }
  };

  const handleDeleteBlock = (category: string, block: string) => {
    const confirmed = window.confirm(`Delete block "${block}"?\n\nThis action cannot be undone.`);
    if (confirmed) {
      deleteBlock(category, block);
    }
  };

  const handleDeleteCategory = (category: string) => {
    const blocks = listBlocks(category);
    const blockCount = blocks.length;

    let message = `Delete category "${category}"?`;
    if (blockCount > 0) {
      message += `\n\n⚠️ WARNING: This will also delete ${blockCount} block${blockCount > 1 ? 's' : ''}:\n• ${blocks.join('\n• ')}`;
    }
    message += '\n\nThis action cannot be undone.';

    const confirmed = window.confirm(message);
    if (confirmed) {
      deleteCategory(category);
    }
  };

  const handleStartAddBlock = (category: string) => {
    // Expand category if not already expanded
    if (!expandedCategories.includes(category)) {
      toggleCategory(category);
    }
    setNewBlockCategory(category);
    setNewBlockName('');
  };

  const handleRenameCategory = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      renameCategory(oldName, newName.trim());
    }
    setEditingCategory(null);
    setEditingCategoryName('');
  };

  const handleRenameBlock = (category: string, oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      renameBlock(category, oldName, newName.trim());
    }
    setEditingBlock(null);
    setEditingBlockName('');
  };

  const handleBlockClick = (category: string, block: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift+Click: open in secondary panel
      setSecondarySelection({ category, block });
    } else {
      // Normal click: select block, close secondary if same block
      setSelection({ category, block });
      // If clicking the same block that's in secondary, close secondary
      if (secondarySelection?.category === category && secondarySelection?.block === block) {
        setSecondarySelection(null);
      }
    }
  };

  const isBlockSelected = (category: string, block: string) =>
    selection?.category === category && selection?.block === block;

  const isBlockSecondary = (category: string, block: string) =>
    secondarySelection?.category === category && secondarySelection?.block === block;

  // Category drag handlers
  const handleCategoryDragStart = (e: DragEvent, category: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', category);
    setDraggedCategory(category);
  };

  const handleCategoryDragOver = (e: DragEvent, category: string) => {
    if (!draggedCategory || draggedCategory === category) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetCategory(category);
  };

  const handleCategoryDragLeave = () => {
    setDropTargetCategory(null);
  };

  const handleCategoryDrop = (e: DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory === targetCategory) return;

    const fromIndex = categories.indexOf(draggedCategory);
    const toIndex = categories.indexOf(targetCategory);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderCategories(fromIndex, toIndex);
    }

    setDraggedCategory(null);
    setDropTargetCategory(null);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategory(null);
    setDropTargetCategory(null);
  };

  // Block drag handlers
  const handleBlockDragStart = (e: DragEvent, category: string, block: string) => {
    e.stopPropagation(); // Prevent category drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${category}:${block}`);
    setDraggedBlock({ category, block });
  };

  const handleBlockDragOver = (e: DragEvent, category: string, block: string) => {
    if (!draggedBlock || (draggedBlock.category === category && draggedBlock.block === block)) return;
    // Only allow reordering within the same category
    if (draggedBlock.category !== category) return;

    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetBlock({ category, block });
  };

  const handleBlockDragLeave = () => {
    setDropTargetBlock(null);
  };

  const handleBlockDrop = (e: DragEvent, targetCategory: string, targetBlock: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBlock || draggedBlock.category !== targetCategory) return;
    if (draggedBlock.block === targetBlock) return;

    const blocks = listBlocks(targetCategory);
    const fromIndex = blocks.indexOf(draggedBlock.block);
    const toIndex = blocks.indexOf(targetBlock);

    if (fromIndex !== -1 && toIndex !== -1) {
      reorderBlocks(targetCategory, fromIndex, toIndex);
    }

    setDraggedBlock(null);
    setDropTargetBlock(null);
  };

  const handleBlockDragEnd = () => {
    setDraggedBlock(null);
    setDropTargetBlock(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-sf-bg-600 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-sf-text-100">Blocks</h2>
        <button
          onClick={() => setShowNewCategory(true)}
          className="p-1 hover:bg-sf-bg-700 rounded"
          title="New Category"
        >
          <Plus size={16} className="text-sf-text-300" />
        </button>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* New category input */}
        {showNewCategory && (
          <div className="mb-2 flex gap-1">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') {
                  setShowNewCategory(false);
                  setNewCategoryName('');
                }
              }}
              placeholder="Category name"
              className="input flex-1 text-sm py-1"
              autoFocus
            />
          </div>
        )}

        {/* Categories */}
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category);
          const blocks = listBlocks(category);

          return (
            <div key={category} className="mb-1">
              {/* Category header */}
              {editingCategory === category ? (
                <div className="tree-item">
                  <ChevronRight size={16} className="text-sf-text-400 shrink-0" />
                  <Folder size={16} className="text-sf-accent-500 shrink-0" />
                  <input
                    type="text"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameCategory(category, editingCategoryName);
                      if (e.key === 'Escape') {
                        setEditingCategory(null);
                        setEditingCategoryName('');
                      }
                    }}
                    onBlur={() => handleRenameCategory(category, editingCategoryName)}
                    onClick={(e) => e.stopPropagation()}
                    className="input flex-1 text-sm py-0.5"
                    autoFocus
                  />
                </div>
              ) : (
                <div
                  className={`tree-item group ${dropTargetCategory === category ? 'ring-1 ring-sf-accent-500' : ''} ${draggedCategory === category ? 'opacity-50' : ''}`}
                  onClick={() => toggleCategory(category)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(category);
                    setEditingCategoryName(category);
                  }}
                  draggable
                  onDragStart={(e) => handleCategoryDragStart(e, category)}
                  onDragOver={(e) => handleCategoryDragOver(e, category)}
                  onDragLeave={handleCategoryDragLeave}
                  onDrop={(e) => handleCategoryDrop(e, category)}
                  onDragEnd={handleCategoryDragEnd}
                >
                  <GripVertical size={14} className="text-sf-text-500 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-sf-text-400 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-sf-text-400 shrink-0" />
                  )}
                  <Folder size={16} className="text-sf-accent-500 shrink-0" />
                  <span className="text-sm truncate flex-1">{category}</span>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartAddBlock(category);
                      }}
                      className="p-0.5 hover:bg-sf-bg-600 rounded"
                      title="New Block"
                    >
                      <Plus size={14} className="text-sf-text-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category);
                      }}
                      className="p-0.5 hover:bg-sf-bg-600 rounded hover:text-sf-error"
                      title="Delete Category"
                    >
                      <X size={14} className="text-sf-text-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Blocks in category */}
              {isExpanded && (
                <div className="ml-4">
                  {/* New block input */}
                  {newBlockCategory === category && (
                    <div className="my-1 flex gap-1">
                      <input
                        type="text"
                        value={newBlockName}
                        onChange={(e) => setNewBlockName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateBlock(category);
                          if (e.key === 'Escape') {
                            setNewBlockCategory(null);
                            setNewBlockName('');
                          }
                        }}
                        placeholder="Block name"
                        className="input flex-1 text-sm py-1"
                        autoFocus
                      />
                    </div>
                  )}

                  {blocks.map((block) => {
                    const isSelected = isBlockSelected(category, block);
                    const isSecondary = isBlockSecondary(category, block);
                    const isEditing =
                      editingBlock?.category === category && editingBlock?.block === block;

                    return isEditing ? (
                      <div key={block} className="tree-item ml-2">
                        <FileText size={16} className="text-sf-text-400 shrink-0" />
                        <input
                          type="text"
                          value={editingBlockName}
                          onChange={(e) => setEditingBlockName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameBlock(category, block, editingBlockName);
                            if (e.key === 'Escape') {
                              setEditingBlock(null);
                              setEditingBlockName('');
                            }
                          }}
                          onBlur={() => handleRenameBlock(category, block, editingBlockName)}
                          onClick={(e) => e.stopPropagation()}
                          className="input flex-1 text-sm py-0.5"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div
                        key={block}
                        className={`tree-item ml-2 group ${isSelected ? 'selected' : ''} ${isSecondary ? 'ring-1 ring-sf-accent-400' : ''} ${dropTargetBlock?.category === category && dropTargetBlock?.block === block ? 'ring-1 ring-sf-accent-500' : ''} ${draggedBlock?.category === category && draggedBlock?.block === block ? 'opacity-50' : ''}`}
                        onClick={(e) => handleBlockClick(category, block, e)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingBlock({ category, block });
                          setEditingBlockName(block);
                        }}
                        draggable
                        onDragStart={(e) => handleBlockDragStart(e, category, block)}
                        onDragOver={(e) => handleBlockDragOver(e, category, block)}
                        onDragLeave={handleBlockDragLeave}
                        onDrop={(e) => handleBlockDrop(e, category, block)}
                        onDragEnd={handleBlockDragEnd}
                      >
                        <GripVertical size={14} className="text-sf-text-500 shrink-0 cursor-grab opacity-0 group-hover:opacity-100" />
                        <FileText size={16} className={`shrink-0 ${isSecondary ? 'text-sf-accent-400' : 'text-sf-text-400'}`} />
                        <span className="text-sm truncate flex-1">{block}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSecondarySelection({ category, block });
                            }}
                            className="p-0.5 hover:bg-sf-bg-600 rounded"
                            title="Open in side panel"
                          >
                            <PanelRight size={14} className="text-sf-text-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateBlock(category, block);
                            }}
                            className="p-0.5 hover:bg-sf-bg-600 rounded"
                            title="Duplicate block"
                          >
                            <Copy size={14} className="text-sf-text-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(category, block);
                            }}
                            className="p-0.5 hover:bg-sf-bg-600 rounded hover:text-sf-error"
                            title="Delete block"
                          >
                            <X size={14} className="text-sf-text-400" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {blocks.length === 0 && newBlockCategory !== category && (
                    <div className="text-xs text-sf-text-400 py-1 pl-6 italic">
                      No blocks
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {categories.length === 0 && !showNewCategory && (
          <div className="text-sm text-sf-text-400 text-center py-8">
            <p>No categories yet</p>
            <button
              onClick={() => setShowNewCategory(true)}
              className="text-sf-accent-500 hover:underline mt-2"
            >
              Create one
            </button>
          </div>
        )}
      </div>

      {/* Search (placeholder) */}
      <div className="p-2 border-t border-sf-bg-600">
        <input
          type="text"
          placeholder="Search blocks..."
          className="input w-full text-sm py-1.5"
        />
      </div>
    </div>
  );
}
