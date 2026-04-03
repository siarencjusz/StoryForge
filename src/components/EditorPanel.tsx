import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Trash2, RefreshCw, X, GripHorizontal, Sparkles, Square, FastForward, Loader2, Eye } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useLLMStore } from '../store/llmStore';
import { resolveReferences } from '../utils/referenceUtils';
import { estimateTokens, formatTokenCount } from '../utils/tokenUtils';
import { Hint } from './Hint';
import { HighlightedTextarea } from './HighlightedTextarea';
import { StageTabs } from './editor/StageTabs';
import { OutputSection } from './editor/OutputSection';
import { PromptPreviewModal } from './editor/PromptPreviewModal';
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
  // Comparison mode: track up to 2 versions for side-by-side view
  const [compareVersions, setCompareVersions] = useState<[string, string] | null>(null);
  // Resizable input panel
  const [inputHeight, setInputHeight] = useState(250);
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

  // Generation handlers
  const handleGenerateNew = useCallback(() => {
    if (!activeStage || !selection) return;

    const freshBlocks = useProjectStore.getState().project.blocks;
    const stage = getStage(category, block, activeStage);
    if (!stage) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    const { resolved, errors } = resolveReferences(stage.input, freshBlocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    const currentVersions = listVersions(category, block, activeStage);
    const nextVersion = `v${currentVersions.length + 1}`;
    addVersion(category, block, activeStage, nextVersion, '');
    selectVersion(category, block, activeStage, nextVersion);
    setCompareVersions(null);

    generateStreaming(
      resolved,
      (_token, fullContent) => {
        updateVersionContent(category, block, activeStage, nextVersion, fullContent);
      },
      (content) => {
        updateVersionContent(category, block, activeStage, nextVersion, content);
      },
      (error) => {
        alert(`Generation failed: ${error}`);
        updateVersionContent(category, block, activeStage, nextVersion, `[Generation Error: ${error}]`);
      }
    );
  }, [activeStage, selection, category, block, getStage, getActiveConfig, setShowSettings, generateStreaming, addVersion, selectVersion, updateVersionContent, listVersions]);

  const handleRegenerate = useCallback(() => {
    if (!activeStage || !selection) return;

    const freshBlocks = useProjectStore.getState().project.blocks;
    const stage = getStage(category, block, activeStage);
    if (!stage?.selected) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    const { resolved, errors } = resolveReferences(stage.input, freshBlocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    const currentVersion = stage.selected;

    generateStreaming(
      resolved,
      (_token, fullContent) => {
        updateVersionContent(category, block, activeStage, currentVersion, fullContent);
      },
      (content) => {
        updateVersionContent(category, block, activeStage, currentVersion, content);
      },
      (error) => {
        alert(`Generation failed: ${error}`);
      }
    );
  }, [activeStage, selection, category, block, getStage, getActiveConfig, setShowSettings, generateStreaming, updateVersionContent]);

  const handleContinue = useCallback(() => {
    if (!activeStage || !selection) return;

    const freshBlocks = useProjectStore.getState().project.blocks;
    const stage = getStage(category, block, activeStage);
    if (!stage?.selected) return;

    const activeConfig = getActiveConfig();
    if (!activeConfig) {
      setShowSettings(true);
      return;
    }

    const { resolved, errors } = resolveReferences(stage.input, freshBlocks);

    if (errors.length > 0) {
      alert(`Cannot generate: Missing references:\n${errors.join('\n')}`);
      return;
    }

    const currentVersion = stage.selected;
    const existingContent = stage.output[currentVersion] ?? '';

    generateStreaming(
      resolved + existingContent,
      (_token, newContent) => {
        updateVersionContent(category, block, activeStage, currentVersion, existingContent + newContent);
      },
      (content) => {
        updateVersionContent(category, block, activeStage, currentVersion, existingContent + content);
      },
      (error) => {
        alert(`Generation failed: ${error}`);
      }
    );
  }, [activeStage, selection, category, block, getStage, getActiveConfig, setShowSettings, generateStreaming, updateVersionContent]);

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

    const rawInputTokens = estimateTokens(currentStage.input);
    const { resolved, references } = resolveReferences(currentStage.input, project.blocks);
    const resolvedInputTokens = estimateTokens(resolved);

    const breakdown: Array<{ ref: string; tokens: number }> = [];
    const inputWithoutRefs = currentStage.input.replace(/\[[^\]]+\]/g, '');
    const baseTokens = estimateTokens(inputWithoutRefs);

    for (const ref of references) {
      if (ref.content) {
        breakdown.push({
          ref: ref.ref,
          tokens: estimateTokens(ref.content),
        });
      }
    }

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
    if (!currentStage) return { resolved: '', errors: [], warnings: [], rawInput: '' };

    const { resolved, errors, warnings } = resolveReferences(currentStage.input, project.blocks);

    return { resolved, errors, warnings, rawInput: currentStage.input };
  }, [currentStage, project.blocks]);

  // Version action wrappers (bind category/block/stage context)
  const handleSelectVersion = useCallback((version: string) => {
    if (activeStage) selectVersion(category, block, activeStage, version);
  }, [activeStage, category, block, selectVersion]);

  const handleAddVersion = useCallback(() => {
    if (!activeStage) return;
    const nextVersion = `v${versions.length + 1}`;
    addVersion(category, block, activeStage, nextVersion, '');
    selectVersion(category, block, activeStage, nextVersion);
    setCompareVersions(null);
  }, [activeStage, category, block, versions.length, addVersion, selectVersion]);

  const handleDeleteVersionAction = useCallback((version: string) => {
    if (activeStage) deleteVersion(category, block, activeStage, version);
  }, [activeStage, category, block, deleteVersion]);

  const handleRenameVersionAction = useCallback((oldName: string, newName: string) => {
    if (activeStage) renameVersion(category, block, activeStage, oldName, newName);
  }, [activeStage, category, block, renameVersion]);

  const handleReorderVersionsAction = useCallback((from: number, to: number) => {
    if (activeStage) reorderVersions(category, block, activeStage, from, to);
  }, [activeStage, category, block, reorderVersions]);

  const handleUpdateContent = useCallback((version: string, content: string) => {
    if (activeStage) updateVersionContent(category, block, activeStage, version, content);
  }, [activeStage, category, block, updateVersionContent]);

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
      <StageTabs
        stages={stages}
        activeStage={activeStage}
        onStageSelect={setActiveStage}
        onStageCreate={(name) => {
          addStage(category, block, name);
          setActiveStage(name);
        }}
        onStageRename={(oldName, newName) => {
          renameStage(category, block, oldName, newName);
          if (activeStage === oldName) setActiveStage(newName);
        }}
        onStageReorder={(from, to) => reorderStages(category, block, from, to)}
      />

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
                  onClick={() => {
                    if (!activeStage) return;
                    const confirmed = window.confirm(`Delete stage "${activeStage}"? This cannot be undone.`);
                    if (confirmed) deleteStage(category, block, activeStage);
                  }}
                  className="p-1 text-sf-text-400 hover:text-sf-error rounded"
                  title="Delete Stage"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <HighlightedTextarea
                value={currentStage.input}
                onChange={(val) =>
                  activeStage && updateStageInput(category, block, activeStage, val)
                }
                blocks={project.blocks}
                placeholder="Enter prompt template... Use [block_name] to reference other blocks"
                className="w-full flex-1"
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
          <OutputSection
            currentStage={currentStage}
            versions={versions}
            outputTokenCount={tokenCounts.output}
            compareVersions={compareVersions}
            onCompareVersionsChange={setCompareVersions}
            onSelectVersion={handleSelectVersion}
            onAddVersion={handleAddVersion}
            onDeleteVersion={handleDeleteVersionAction}
            onRenameVersion={handleRenameVersionAction}
            onReorderVersions={handleReorderVersionsAction}
            onUpdateContent={handleUpdateContent}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sf-text-400">
          <div className="text-center">
            <p>No stages in this block</p>
            <button
              onClick={() => addStage(category, block, 'main')}
              className="text-sf-accent-500 hover:underline mt-2"
            >
              Add a stage
            </button>
          </div>
        </div>
      )}

      {/* Prompt Preview Modal */}
      {showPromptPreview && (
        <PromptPreviewModal
          rawInput={promptPreview.rawInput}
          resolved={promptPreview.resolved}
          errors={promptPreview.errors}
          warnings={promptPreview.warnings}
          onClose={() => setShowPromptPreview(false)}
        />
      )}
    </div>
  );
}
