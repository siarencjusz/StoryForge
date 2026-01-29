import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Check, Trash2, RefreshCw, X, Columns2, GripVertical, Sparkles, Square, FastForward, GripHorizontal } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import type { Selection } from '../types';

interface EditorPanelProps {
  /** Override selection (for secondary panel) */
  selectionOverride?: Selection | null;
  /** Called when close button is clicked (for secondary panel) */
  onClose?: () => void;
  /** Whether this is the secondary panel */
  isSecondary?: boolean;
}

export function EditorPanel({ selectionOverride, onClose, isSecondary }: EditorPanelProps) {
  const {
    selection: storeSelection,
    listStages,
    getStage,
    addStage,
    updateStageInput,
    deleteStage,
    renameStage,
    reorderStages,
    listVersions,
    addVersion,
    updateVersionContent,
    selectVersion,
    renameVersion,
  } = useProjectStore();

  // Use override selection if provided, otherwise use store selection
  const selection = selectionOverride !== undefined ? selectionOverride : storeSelection;

  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState('');
  const [showNewStage, setShowNewStage] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState('');
  // Comparison mode: track up to 2 versions for side-by-side view
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);
  // Drag & drop state for stages
  const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);
  const [dragOverStageIndex, setDragOverStageIndex] = useState<number | null>(null);
  // Resizable input panel
  const [inputHeight, setInputHeight] = useState(250); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = e.clientY - containerRect.top;
      // Clamp between 100px and container height - 150px (leave room for output)
      const maxHeight = containerRect.height - 150;
      setInputHeight(Math.max(100, Math.min(newHeight, maxHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Reset active stage when selection changes
  useEffect(() => {
    setActiveStage(null);
    setCompareVersions(null);
  }, [selection?.category, selection?.block]);

  // No selection state
  if (!selection) {
    return (
      <div className="flex items-center justify-center h-full text-sf-text-400">
        <div className="text-center">
          <p className="text-lg">No block selected</p>
          <p className="text-sm mt-2">Select a block from the tree to edit</p>
        </div>
      </div>
    );
  }
  const { category, block } = selection;
  const stages = listStages(category, block);
  // Auto-select first stage if none selected
  if (stages.length > 0 && !activeStage) {
    setActiveStage(stages[0]);
  }
  const currentStage = activeStage ? getStage(category, block, activeStage) : null;
  const versions = activeStage ? listVersions(category, block, activeStage) : [];
  const handleCreateStage = () => {
    if (newStageName.trim()) {
      addStage(category, block, newStageName.trim());
      setActiveStage(newStageName.trim());
      setNewStageName('');
      setShowNewStage(false);
    }
  };

  const handleRenameStage = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      renameStage(category, block, oldName, newName.trim());
      if (activeStage === oldName) {
        setActiveStage(newName.trim());
      }
    }
    setEditingStage(null);
    setEditingStageName('');
  };

  const handleRenameVersion = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName && activeStage) {
      renameVersion(category, block, activeStage, oldName, newName.trim());
    }
    setEditingVersion(null);
    setEditingVersionName('');
  };

  const handleAddVersion = () => {
    if (!activeStage) return;
    const nextVersion = `v${versions.length + 1}`;
    addVersion(category, block, activeStage, nextVersion, '');
    selectVersion(category, block, activeStage, nextVersion);
    setCompareVersions(null); // Exit comparison mode when adding new version
  };

  const handleVersionClick = (version: string, e: React.MouseEvent) => {
    if (!activeStage) return;

    if (e.shiftKey && versions.length >= 2) {
      // Shift+Click: toggle comparison mode
      if (compareVersions) {
        // Already comparing - add/remove from comparison
        if (compareVersions.includes(version)) {
          // Remove from comparison, exit compare mode
          setCompareVersions(null);
        } else {
          // Replace second version
          setCompareVersions([compareVersions[0], version]);
        }
      } else {
        // Start comparison with selected + shift-clicked
        const selected = currentStage?.selected;
        if (selected && selected !== version) {
          setCompareVersions([selected, version]);
        }
      }
    } else {
      // Normal click: select version, exit comparison mode
      selectVersion(category, block, activeStage, version);
      setCompareVersions(null);
    }
  };

  const isInComparison = (version: string) => compareVersions?.includes(version) ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-3 border-b border-sf-bg-600 ${isSecondary ? 'bg-sf-bg-700/30' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sf-text-400 text-sm">{category}</span>
            <span className="text-sf-text-400">/</span>
            <span className="text-sf-text-100 font-medium">{block}</span>
            {isSecondary && (
              <span className="text-xs text-sf-accent-400 ml-2">(Compare)</span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-600 rounded"
              title="Close panel"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {/* Stage tabs */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-sf-bg-600 overflow-x-auto">
        {stages.map((stage, index) => (
          editingStage === stage ? (
            <input
              key={stage}
              type="text"
              value={editingStageName}
              onChange={(e) => setEditingStageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameStage(stage, editingStageName);
                if (e.key === 'Escape') {
                  setEditingStage(null);
                  setEditingStageName('');
                }
              }}
              onBlur={() => handleRenameStage(stage, editingStageName)}
              className="input text-sm py-0.5 px-2 w-24"
              autoFocus
            />
          ) : (
            <button
              key={stage}
              draggable
              onDragStart={(e) => {
                setDraggedStageIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', stage);
              }}
              onDragEnd={() => {
                setDraggedStageIndex(null);
                setDragOverStageIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedStageIndex !== null && draggedStageIndex !== index) {
                  setDragOverStageIndex(index);
                }
              }}
              onDragLeave={() => {
                setDragOverStageIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedStageIndex !== null && draggedStageIndex !== index) {
                  reorderStages(category, block, draggedStageIndex, index);
                }
                setDraggedStageIndex(null);
                setDragOverStageIndex(null);
              }}
              onClick={() => setActiveStage(stage)}
              onDoubleClick={() => {
                setEditingStage(stage);
                setEditingStageName(stage);
              }}
              className={`group flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors whitespace-nowrap ${
                activeStage === stage
                  ? 'bg-sf-bg-700 text-sf-text-100'
                  : 'text-sf-text-300 hover:text-sf-text-200 hover:bg-sf-bg-700/50'
              } ${draggedStageIndex === index ? 'opacity-50' : ''} ${
                dragOverStageIndex === index ? 'ring-2 ring-sf-accent-500' : ''
              }`}
            >
              <GripVertical size={12} className="text-sf-text-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
              {stage}
            </button>
          )
        ))}
        {showNewStage ? (
          <input
            type="text"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateStage();
              if (e.key === 'Escape') {
                setShowNewStage(false);
                setNewStageName('');
              }
            }}
            placeholder="Stage name"
            className="input text-sm py-0.5 px-2 w-24"
            autoFocus
          />
        ) : (
          <button
            onClick={() => setShowNewStage(true)}
            className="p-1 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-700 rounded"
            title="Add Stage"
          >
            <Plus size={16} />
          </button>
        )}
      </div>

      {/* Stage content */}
      {currentStage ? (
        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Input section - resizable */}
          <div className="flex flex-col shrink-0" style={{ height: inputHeight }}>
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-sf-text-300">INPUT</label>
                <button
                  onClick={() => activeStage && deleteStage(category, block, activeStage)}
                  className="p-1 text-sf-text-400 hover:text-sf-error rounded"
                  title="Delete Stage"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={currentStage.input}
                onChange={(e) =>
                  activeStage && updateStageInput(category, block, activeStage, e.target.value)
                }
                placeholder="Enter prompt template... Use [block_name] to reference other blocks"
                className="textarea w-full flex-1 resize-none"
              />
              <div className="mt-2 flex justify-end gap-2 shrink-0">
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  title="Continue generating from the end of the current output"
                >
                  <FastForward size={14} />
                  Continue
                </button>
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  title="Stop generation"
                >
                  <Square size={14} />
                  Stop
                </button>
                <button
                  className="btn btn-secondary flex items-center gap-2"
                  title="Regenerate the currently selected version"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
                <button className="btn btn-primary flex items-center gap-2" title="Generate a new version">
                  <Sparkles size={14} />
                  Generate New
                </button>
              </div>
            </div>
          </div>

          {/* Resize handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`h-2 flex items-center justify-center cursor-row-resize border-y border-sf-bg-600 hover:bg-sf-bg-600 transition-colors ${
              isResizing ? 'bg-sf-accent-500/20' : 'bg-sf-bg-700'
            }`}
          >
            <GripHorizontal size={14} className="text-sf-text-400" />
          </div>

          {/* Output section */}
          <div className="flex-1 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-sf-text-300">
                OUTPUT {currentStage.selected && !compareVersions && `(${currentStage.selected} selected)`}
                {compareVersions && (
                  <span className="ml-2 text-sf-accent-400">
                    Comparing: {compareVersions[0]} vs {compareVersions[1]}
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                {compareVersions ? (
                  <button
                    onClick={() => setCompareVersions(null)}
                    className="p-1 text-sf-text-400 hover:text-sf-text-200 rounded flex items-center gap-1 text-xs"
                    title="Exit comparison"
                  >
                    <X size={14} />
                    Exit Compare
                  </button>
                ) : versions.length >= 2 && (
                  <span className="text-xs text-sf-text-400">
                    <Columns2 size={12} className="inline mr-1" />
                    Shift+Click to compare
                  </span>
                )}
              </div>
            </div>
            {/* Version tabs */}
            <div className="flex items-center gap-1 mb-2">
              {versions.map((version) => (
                editingVersion === version ? (
                  <input
                    key={version}
                    type="text"
                    value={editingVersionName}
                    onChange={(e) => setEditingVersionName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameVersion(version, editingVersionName);
                      if (e.key === 'Escape') {
                        setEditingVersion(null);
                        setEditingVersionName('');
                      }
                    }}
                    onBlur={() => handleRenameVersion(version, editingVersionName)}
                    className="input text-xs py-0.5 px-2 w-16"
                    autoFocus
                  />
                ) : (
                  <button
                    key={version}
                    onClick={(e) => handleVersionClick(version, e)}
                    onDoubleClick={() => {
                      setEditingVersion(version);
                      setEditingVersionName(version);
                    }}
                    className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
                      isInComparison(version)
                        ? 'bg-sf-accent-500 text-white ring-2 ring-sf-accent-300'
                        : currentStage.selected === version
                          ? 'bg-sf-accent-600 text-white'
                          : 'bg-sf-bg-700 text-sf-text-300 hover:bg-sf-bg-600'
                    }`}
                  >
                    {version}
                    {currentStage.selected === version && !compareVersions && <Check size={12} />}
                    {isInComparison(version) && <Columns2 size={12} />}
                  </button>
                )
              ))}
              <button
                onClick={handleAddVersion}
                className="px-2 py-0.5 text-xs bg-sf-bg-700 text-sf-text-300 hover:bg-sf-bg-600 rounded"
                title="Add Version"
              >
                <Plus size={12} />
              </button>
            </div>
            {/* Version content */}
            <div className="flex-1 overflow-y-auto">
              {compareVersions ? (
                /* Side-by-side comparison view */
                <div className="flex gap-3 h-full">
                  {compareVersions.map((version) => (
                    <div key={version} className="flex-1 flex flex-col min-w-0">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-medium text-sf-text-300">{version}</span>
                        <button
                          onClick={() => {
                            if (activeStage) {
                              selectVersion(category, block, activeStage, version);
                              setCompareVersions(null);
                            }
                          }}
                          className="text-xs text-sf-accent-400 hover:text-sf-accent-300"
                          title="Select this version"
                        >
                          <Check size={12} className="inline mr-1" />
                          Select
                        </button>
                      </div>
                      <textarea
                        value={currentStage.output[version] ?? ''}
                        onChange={(e) => {
                          if (activeStage) {
                            updateVersionContent(category, block, activeStage, version, e.target.value);
                          }
                        }}
                        className="textarea w-full flex-1 min-h-[200px]"
                        placeholder="Content..."
                      />
                    </div>
                  ))}
                </div>
              ) : currentStage.selected && currentStage.output[currentStage.selected] !== undefined ? (
                <textarea
                  value={currentStage.output[currentStage.selected]}
                  onChange={(e) => {
                    if (activeStage && currentStage.selected) {
                      updateVersionContent(category, block, activeStage, currentStage.selected, e.target.value);
                    }
                  }}
                  className="textarea w-full h-full min-h-[200px]"
                  placeholder="Generated content will appear here..."
                />
              ) : (
                <div className="text-sf-text-400 text-sm text-center py-8">
                  {versions.length === 0 ? (
                    <p>No versions yet. Click Generate or add a version manually.</p>
                  ) : (
                    <p>Select a version to view/edit</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sf-text-400">
          <div className="text-center">
            <p>No stages in this block</p>
            <button
              onClick={() => setShowNewStage(true)}
              className="text-sf-accent-500 hover:underline mt-2"
            >
              Add a stage
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
