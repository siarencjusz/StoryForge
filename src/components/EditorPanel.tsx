import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Check, Trash2, RefreshCw, X, Columns2, GripVertical, Sparkles, Square, FastForward, GripHorizontal, Loader2, Eye } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useLLMStore } from '../store/llmStore';
import { resolveReferences } from '../utils/referenceUtils';
import { estimateTokens, formatTokenCount } from '../utils/tokenUtils';
import { Hint } from './Hint';
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
    project,
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
    deleteVersion,
    renameVersion,
    reorderVersions,
  } = useProjectStore();

  const { generateStreaming, stopGeneration, generationState, getActiveConfig, setShowSettings } = useLLMStore();

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
  // Drag & drop state for versions
  const [draggedVersionIndex, setDraggedVersionIndex] = useState<number | null>(null);
  const [dragOverVersionIndex, setDragOverVersionIndex] = useState<number | null>(null);
  // Resizable input panel
  const [inputHeight, setInputHeight] = useState(250); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Prompt preview modal
  const [showPromptPreview, setShowPromptPreview] = useState(false);

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

  // Get stages for current selection
  const stages = selection ? listStages(selection.category, selection.block) : [];
  const category = selection?.category ?? '';
  const block = selection?.block ?? '';
  const currentStage = activeStage && selection ? getStage(category, block, activeStage) : null;
  const versions = activeStage && selection ? listVersions(category, block, activeStage) : [];

  // Auto-select first stage if none selected
  useEffect(() => {
    if (stages.length > 0 && !activeStage) {
      setActiveStage(stages[0]);
    }
  }, [stages, activeStage]);

  // Generation handlers - must be defined before any returns
  const handleGenerateNew = useCallback(() => {
    if (!activeStage || !currentStage || !selection) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    // Resolve references in the input
    const { resolved, errors } = resolveReferences(currentStage.input, project.blocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    // Get current versions directly from store to avoid stale closure issues
    const currentVersions = listVersions(category, block, activeStage);

    // Create a new version for the output
    const nextVersion = `v${currentVersions.length + 1}`;
    addVersion(category, block, activeStage, nextVersion, '');
    selectVersion(category, block, activeStage, nextVersion);
    setCompareVersions(null);

    // Send to LLM with streaming
    generateStreaming(
      [{ role: 'user', content: resolved }],
      (_token, fullContent) => {
        // Update content live as tokens arrive
        updateVersionContent(category, block, activeStage, nextVersion, fullContent);
      },
      (content) => {
        // On complete, ensure final content is saved
        updateVersionContent(category, block, activeStage, nextVersion, content);
      },
      (error) => {
        // On error, show alert and mark the version
        alert(`Generation failed: ${error}`);
        updateVersionContent(category, block, activeStage, nextVersion, `[Generation Error: ${error}]`);
      }
    );
  }, [activeStage, currentStage, selection, category, block, project.blocks, getActiveConfig, setShowSettings, generateStreaming, addVersion, selectVersion, updateVersionContent, listVersions]);

  const handleRegenerate = useCallback(() => {
    if (!activeStage || !currentStage || !currentStage.selected || !selection) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    // Resolve references in the input
    const { resolved, errors } = resolveReferences(currentStage.input, project.blocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    const currentVersion = currentStage.selected;

    // Send to LLM with streaming
    generateStreaming(
      [{ role: 'user', content: resolved }],
      (_token, fullContent) => {
        // Update content live as tokens arrive
        updateVersionContent(category, block, activeStage, currentVersion, fullContent);
      },
      (content) => {
        updateVersionContent(category, block, activeStage, currentVersion, content);
      },
      (error) => {
        alert(`Generation failed: ${error}`);
      }
    );
  }, [activeStage, currentStage, selection, category, block, project.blocks, getActiveConfig, setShowSettings, generateStreaming, updateVersionContent]);

  const handleContinue = useCallback(() => {
    if (!activeStage || !currentStage || !currentStage.selected || !selection) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    // Resolve references in the input
    const { resolved, errors } = resolveReferences(currentStage.input, project.blocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    const currentVersion = currentStage.selected;
    const existingContent = currentStage.output[currentVersion] ?? '';

    // Send to LLM with existing content as context, streaming
    generateStreaming(
      [
        { role: 'user', content: resolved },
        { role: 'assistant', content: existingContent },
        { role: 'user', content: 'Continue from where you left off.' },
      ],
      (_token, newContent) => {
        // Update content live - append new tokens to existing content
        updateVersionContent(category, block, activeStage, currentVersion, existingContent + newContent);
      },
      (content) => {
        updateVersionContent(category, block, activeStage, currentVersion, existingContent + content);
      },
      (error) => {
        alert(`Generation failed: ${error}`);
      }
    );
  }, [activeStage, currentStage, selection, category, block, project.blocks, getActiveConfig, setShowSettings, generateStreaming, updateVersionContent]);

  const handleStopGeneration = useCallback(() => {
    stopGeneration();
  }, [stopGeneration]);

  const isGenerating = generationState.status === 'generating';

  // Calculate token counts for current stage with breakdown
  const tokenCounts = useMemo(() => {
    const emptyResult = {
      input: 0,
      output: 0,
      resolvedInput: 0,
      baseTokens: 0,
      breakdown: [] as Array<{ ref: string; tokens: number }>
    };

    if (!currentStage) return emptyResult;

    // Count raw input tokens (without resolving references)
    const rawInputTokens = estimateTokens(currentStage.input);

    // Get resolved content and references info
    const { resolved, references } = resolveReferences(currentStage.input, project.blocks);
    const resolvedInputTokens = estimateTokens(resolved);

    // Build breakdown of token contributions
    const breakdown: Array<{ ref: string; tokens: number }> = [];

    // Calculate base tokens (input without references)
    const inputWithoutRefs = currentStage.input.replace(/\[[^\]]+\]/g, '');
    const baseTokens = estimateTokens(inputWithoutRefs);

    // Add each reference's contribution
    for (const ref of references) {
      if (ref.content) {
        breakdown.push({
          ref: ref.ref,
          tokens: estimateTokens(ref.content),
        });
      }
    }

    // Count output tokens for selected version
    const selectedOutput = currentStage.selected ? currentStage.output[currentStage.selected] : '';
    const outputTokens = estimateTokens(selectedOutput || '');

    return {
      input: rawInputTokens,
      output: outputTokens,
      resolvedInput: resolvedInputTokens,
      baseTokens,
      breakdown,
    };
  }, [currentStage, project.blocks]);

  // Compute the full prompt preview (what would be sent to LLM)
  const promptPreview = useMemo(() => {
    if (!currentStage) return { resolved: '', errors: [], rawInput: '', messages: [] as Array<{ role: string; content: string }> };

    const { resolved, errors } = resolveReferences(currentStage.input, project.blocks);
    const selectedOutput = currentStage.selected ? currentStage.output[currentStage.selected] : '';

    // Build the messages array that would be sent to the LLM
    const messages: Array<{ role: string; content: string }> = [
      { role: 'user', content: resolved }
    ];

    // If there's existing output (for continue), show that too
    if (selectedOutput) {
      messages.push({ role: 'assistant', content: selectedOutput });
    }

    return {
      resolved,
      errors,
      rawInput: currentStage.input,
      messages,
    };
  }, [currentStage, project.blocks]);

  // Handler to delete a version with confirmation
  const handleDeleteVersion = useCallback((version: string) => {
    if (!activeStage) return;

    const confirmed = window.confirm(`Delete version "${version}"? This cannot be undone.`);
    if (!confirmed) return;

    if (versions.length <= 1) {
      // If this is the last version, create a fresh v1 to replace it
      deleteVersion(category, block, activeStage, version);
      addVersion(category, block, activeStage, 'v1', '');
      selectVersion(category, block, activeStage, 'v1');
    } else {
      deleteVersion(category, block, activeStage, version);

      // If we deleted the selected version, select another one
      if (currentStage?.selected === version) {
        const remaining = versions.filter(v => v !== version);
        if (remaining.length > 0) {
          selectVersion(category, block, activeStage, remaining[0]);
        }
      }
    }
  }, [activeStage, versions, category, block, currentStage, deleteVersion, selectVersion, addVersion]);

  // No selection state - early return AFTER all hooks
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

  // Helper functions (not hooks, so can be after early return)
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
          <Hint hint="editor-add-stage" position="bottom">
            <button
              onClick={() => setShowNewStage(true)}
              className="p-1 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-700 rounded"
            >
              <Plus size={16} />
            </button>
          </Hint>
        )}
      </div>

      {/* Stage content */}
      {currentStage ? (
        <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Input section - resizable */}
          <div className="flex flex-col shrink-0" style={{ height: inputHeight }}>
            <div className="flex-1 flex flex-col p-3 overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-sm font-medium text-sf-text-300">INPUT</label>
                  <span className="text-xs text-sf-text-400 font-mono">
                    {tokenCounts.breakdown.length > 0 ? (
                      <>
                        {formatTokenCount(tokenCounts.resolvedInput)} = {formatTokenCount(tokenCounts.baseTokens)}
                        {tokenCounts.breakdown.map((item, i) => (
                          <span key={i} className="text-sf-text-500"> + {formatTokenCount(item.tokens)}<span className="text-sf-accent-400">[{item.ref}]</span></span>
                        ))}
                      </>
                    ) : (
                      <>{formatTokenCount(tokenCounts.resolvedInput)} tokens</>
                    )}
                  </span>
                </div>
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
                <Hint hint="editor-preview" position="top">
                  <button
                    onClick={() => setShowPromptPreview(true)}
                    disabled={!currentStage?.input}
                    className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Eye size={14} />
                    Preview
                  </button>
                </Hint>
                <Hint hint="editor-continue" position="top">
                  <button
                    onClick={handleContinue}
                    disabled={isGenerating || !currentStage?.selected || !currentStage?.output[currentStage.selected]}
                    className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FastForward size={14} />
                    Continue
                  </button>
                </Hint>
                <Hint hint="editor-stop" position="top">
                  <button
                    onClick={handleStopGeneration}
                    disabled={!isGenerating}
                    className={`btn flex items-center gap-2 ${
                      isGenerating ? 'btn-secondary text-sf-warning' : 'btn-secondary disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    <Square size={14} />
                    Stop
                  </button>
                </Hint>
                <Hint hint="editor-regenerate" position="top">
                  <button
                    onClick={handleRegenerate}
                    disabled={isGenerating || !currentStage?.selected}
                    className="btn btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Regenerate
                  </button>
                </Hint>
                <Hint hint="editor-generate-new" position="top">
                  <button
                    onClick={handleGenerateNew}
                    disabled={isGenerating}
                    className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    Generate New
                  </button>
                </Hint>
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
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-sf-text-300">
                  OUTPUT {currentStage.selected && !compareVersions && `(${currentStage.selected})`}
                  {compareVersions && (
                    <span className="ml-2 text-sf-accent-400">
                      Comparing: {compareVersions[0]} vs {compareVersions[1]}
                    </span>
                  )}
                </label>
                {!compareVersions && tokenCounts.output > 0 && (
                  <span className="text-xs text-sf-text-400 font-mono">
                    ({formatTokenCount(tokenCounts.output)} tokens)
                  </span>
                )}
              </div>
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
              {versions.map((version, index) => (
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
                    draggable
                    onDragStart={(e) => {
                      setDraggedVersionIndex(index);
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', version);
                    }}
                    onDragEnd={() => {
                      setDraggedVersionIndex(null);
                      setDragOverVersionIndex(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggedVersionIndex !== null && draggedVersionIndex !== index) {
                        setDragOverVersionIndex(index);
                      }
                    }}
                    onDragLeave={() => {
                      setDragOverVersionIndex(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedVersionIndex !== null && draggedVersionIndex !== index && activeStage) {
                        reorderVersions(category, block, activeStage, draggedVersionIndex, index);
                      }
                      setDraggedVersionIndex(null);
                      setDragOverVersionIndex(null);
                    }}
                    onClick={(e) => handleVersionClick(version, e)}
                    onDoubleClick={() => {
                      setEditingVersion(version);
                      setEditingVersionName(version);
                    }}
                    className={`group px-2 py-0.5 text-xs rounded flex items-center gap-1 ${
                      isInComparison(version)
                        ? 'bg-sf-accent-500 text-white ring-2 ring-sf-accent-300'
                        : currentStage.selected === version
                          ? 'bg-sf-accent-600 text-white'
                          : 'bg-sf-bg-700 text-sf-text-300 hover:bg-sf-bg-600'
                    } ${draggedVersionIndex === index ? 'opacity-50' : ''} ${
                      dragOverVersionIndex === index ? 'ring-2 ring-sf-accent-500' : ''
                    }`}
                  >
                    <GripVertical size={10} className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
                    {version}
                    {currentStage.selected === version && !compareVersions && <Check size={12} />}
                    {isInComparison(version) && <Columns2 size={12} />}
                  </button>
                )
              ))}
              <Hint hint="editor-add-version" position="bottom">
                <button
                  onClick={handleAddVersion}
                  className="px-2 py-0.5 text-xs bg-sf-bg-700 text-sf-text-300 hover:bg-sf-bg-600 rounded"
                >
                  <Plus size={12} />
                </button>
              </Hint>
              {/* Delete selected version button - separate from version tabs to avoid accidents */}
              {currentStage.selected && (
                <Hint hint="editor-delete-version" position="bottom">
                  <button
                    onClick={() => handleDeleteVersion(currentStage.selected)}
                    className="ml-2 px-2 py-0.5 text-xs bg-sf-bg-700 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded flex items-center gap-1"
                  >
                    <Trash2 size={10} />
                  </button>
                </Hint>
              )}
            </div>
            {/* Version content */}
            <div className="flex-1 overflow-hidden">
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
                        className="textarea w-full flex-1"
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
                  className="textarea w-full h-full"
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

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-sf-bg-800 rounded-lg shadow-xl border border-sf-bg-600 w-[80vw] max-w-4xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-sf-bg-600">
              <h2 className="text-lg font-semibold text-sf-text-100">Prompt Preview</h2>
              <button
                onClick={() => setShowPromptPreview(false)}
                className="p-1 hover:bg-sf-bg-700 rounded text-sf-text-400 hover:text-sf-text-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Errors if any */}
              {promptPreview.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
                  <h3 className="text-sm font-semibold text-red-400 mb-2">Reference Errors</h3>
                  <ul className="text-sm text-red-300 list-disc list-inside">
                    {promptPreview.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Input */}
              <div>
                <h3 className="text-sm font-semibold text-sf-text-300 mb-2">Raw Input (with references)</h3>
                <pre className="bg-sf-bg-900 rounded p-3 text-sm text-sf-text-200 whitespace-pre-wrap overflow-auto max-h-48 border border-sf-bg-600">
                  {promptPreview.rawInput || '(empty)'}
                </pre>
              </div>

              {/* Resolved Prompt */}
              <div>
                <h3 className="text-sm font-semibold text-sf-text-300 mb-2">
                  Resolved Prompt (sent to LLM as user message)
                  <span className="ml-2 text-xs font-mono text-sf-text-400">
                    ~{formatTokenCount(estimateTokens(promptPreview.resolved))} tokens
                  </span>
                </h3>
                <pre className="bg-sf-bg-900 rounded p-3 text-sm text-sf-text-200 whitespace-pre-wrap overflow-auto max-h-96 border border-sf-bg-600">
                  {promptPreview.resolved || '(empty)'}
                </pre>
              </div>

              {/* Messages array visualization */}
              <div>
                <h3 className="text-sm font-semibold text-sf-text-300 mb-2">Messages Array (API Format)</h3>
                <div className="space-y-2">
                  {promptPreview.messages.map((msg, i) => (
                    <div key={i} className="bg-sf-bg-900 rounded border border-sf-bg-600 overflow-hidden">
                      <div className={`px-3 py-1 text-xs font-semibold ${
                        msg.role === 'user' ? 'bg-blue-900/30 text-blue-400' : 'bg-green-900/30 text-green-400'
                      }`}>
                        {msg.role.toUpperCase()}
                      </div>
                      <pre className="p-3 text-sm text-sf-text-200 whitespace-pre-wrap overflow-auto max-h-48">
                        {msg.content || '(empty)'}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-sf-bg-600 flex justify-end">
              <button
                onClick={() => setShowPromptPreview(false)}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
