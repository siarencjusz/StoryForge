import { ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useLLMStore } from '../store/llmStore';
import { useMemo, useCallback } from 'react';
import { estimateTokens, formatTokenCount } from '../utils/tokenUtils';

// Simple reference parser
const REFERENCE_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]/g;

function parseReferences(text: string): string[] {
  const matches = text.matchAll(REFERENCE_PATTERN);
  return [...new Set([...matches].map((m) => m[1]))];
}

// Check if a reference exists in the project
function isReferenceValid(
  ref: string,
  blocks: Record<string, Record<string, Record<string, { input?: string; selected?: string; output?: Record<string, string> }>>>
): boolean {
  const parts = ref.split(':');

  if (parts.length === 1) {
    // Just block name - search all categories
    const blockName = parts[0];
    for (const category of Object.keys(blocks)) {
      if (blocks[category][blockName]) {
        return true;
      }
    }
    return false;
  } else if (parts.length === 2) {
    // category:block
    const [category, blockName] = parts;
    return !!(blocks[category] && blocks[category][blockName]);
  } else if (parts.length === 3) {
    // category:block:stage
    const [category, blockName, stage] = parts;
    return !!(blocks[category] && blocks[category][blockName] && blocks[category][blockName][stage]);
  }

  return false;
}

export function DependencyPanel() {
  const { selection, getBlock, project, setSelection, getSelectedOutput } = useProjectStore();
  const { generationState } = useLLMStore();

  // Helper to get the selected output content for a reference
  const getRefOutputContent = useCallback((ref: string): string | null => {
    const parts = ref.split(':');

    if (parts.length === 1) {
      // Just block name - search all categories
      const blockName = parts[0];
      for (const [cat, blocks] of Object.entries(project.blocks)) {
        if (blocks[blockName]) {
          // Get first stage's selected output
          const block = blocks[blockName];
          const stageNames = Object.keys(block);
          const defaultStage = stageNames.includes('output') ? 'output' :
                              stageNames.includes('raw') ? 'raw' : stageNames[0];
          if (defaultStage) {
            return getSelectedOutput(cat, blockName, defaultStage) ?? null;
          }
        }
      }
      return null;
    } else if (parts.length === 2) {
      // category:block
      const [cat, blockName] = parts;
      const block = project.blocks[cat]?.[blockName];
      if (block) {
        const stageNames = Object.keys(block);
        const defaultStage = stageNames.includes('output') ? 'output' :
                            stageNames.includes('raw') ? 'raw' : stageNames[0];
        if (defaultStage) {
          return getSelectedOutput(cat, blockName, defaultStage) ?? null;
        }
      }
      return null;
    } else if (parts.length === 3) {
      // category:block:stage
      const [cat, blockName, stageName] = parts;
      return getSelectedOutput(cat, blockName, stageName) ?? null;
    }
    return null;
  }, [project.blocks, getSelectedOutput]);

  // Calculate dependencies with token counts
  const dependencies = useMemo(() => {
    if (!selection) return { uses: [], usedBy: [], inputTokens: 0, outputTokens: 0 };

    const { category, block } = selection;
    const blockData = getBlock(category, block);

    // Find references this block uses
    const uses: Array<{ ref: string; category?: string; block: string; stage?: string; isValid: boolean; tokens: number }> = [];
    let totalInputTokens = 0;

    if (blockData) {
      for (const stageData of Object.values(blockData)) {
        // Count tokens in the stage input (excluding resolved references)
        const inputWithoutRefs = stageData.input?.replace(REFERENCE_PATTERN, '') || '';
        totalInputTokens += estimateTokens(inputWithoutRefs);

        const refs = parseReferences(stageData.input || '');
        for (const ref of refs) {
          // Avoid duplicates
          if (uses.some(u => u.ref === ref)) continue;

          const parts = ref.split(':');
          const isValid = isReferenceValid(ref, project.blocks);
          const refContent = getRefOutputContent(ref);
          const tokens = refContent ? estimateTokens(refContent) : 0;

          totalInputTokens += tokens;

          if (parts.length === 1) {
            uses.push({ ref, block: parts[0], isValid, tokens });
          } else if (parts.length === 2) {
            uses.push({ ref, category: parts[0], block: parts[1], isValid, tokens });
          } else if (parts.length === 3) {
            uses.push({ ref, category: parts[0], block: parts[1], stage: parts[2], isValid, tokens });
          }
        }
      }
    }

    // Calculate output tokens for current block
    let totalOutputTokens = 0;
    if (blockData) {
      for (const stageData of Object.values(blockData)) {
        if (stageData.selected && stageData.output[stageData.selected]) {
          totalOutputTokens += estimateTokens(stageData.output[stageData.selected]);
        }
      }
    }

    // Find blocks that reference this block
    const usedBy: Array<{ category: string; block: string; stage: string }> = [];
    for (const [cat, blocks] of Object.entries(project.blocks)) {
      for (const [blkName, blkData] of Object.entries(blocks)) {
        if (cat === category && blkName === block) continue; // Skip self

        for (const [stageName, stageData] of Object.entries(blkData)) {
          const refs = parseReferences(stageData.input || '');
          for (const ref of refs) {
            const parts = ref.split(':');
            // Check if this reference points to our block
            if (
              (parts.length === 1 && parts[0] === block) ||
              (parts.length === 2 && parts[0] === category && parts[1] === block) ||
              (parts.length === 2 && parts[0] === block) ||
              (parts.length === 3 && parts[0] === category && parts[1] === block)
            ) {
              usedBy.push({ category: cat, block: blkName, stage: stageName });
              break; // Only add once per stage
            }
          }
        }
      }
    }

    return { uses, usedBy, inputTokens: totalInputTokens, outputTokens: totalOutputTokens };

  }, [selection, project.blocks, getBlock, getRefOutputContent]);

  if (!selection) {
    return (
      <div className="flex items-center justify-center h-full text-sf-text-400 text-sm">
        Select a block to see dependencies
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-sf-bg-600">
        <h2 className="text-sm font-semibold text-sf-text-100">Dependencies</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">

        {/* Uses section */}
        <div>
          <div className="flex items-center gap-2 text-sm text-sf-text-300 mb-2">
            <ArrowRight size={14} />
            <span>Uses</span>
          </div>
          {dependencies.uses.length > 0 ? (
            <div className="space-y-1">
              {dependencies.uses.map((dep, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (dep.category && dep.isValid) {
                      setSelection({ category: dep.category, block: dep.block });
                    }
                  }}
                  disabled={!dep.isValid}
                  className={`flex items-center justify-between w-full text-left px-2 py-1 text-sm rounded ${
                    dep.isValid 
                      ? 'hover:bg-sf-bg-700 text-sf-accent-500 cursor-pointer' 
                      : 'text-red-500 cursor-not-allowed'
                  }`}
                  title={dep.isValid ? `${dep.tokens} tokens` : 'Missing reference'}
                >
                  <span>
                    [{dep.ref}]
                    {!dep.isValid && <span className="ml-2 text-xs">(missing)</span>}
                  </span>
                  {dep.isValid && dep.tokens > 0 && (
                    <span className="text-xs text-sf-text-400 font-mono">{formatTokenCount(dep.tokens)}</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sf-text-400 italic pl-6">No references</p>
          )}
        </div>

        {/* Used by section */}
        <div>
          <div className="flex items-center gap-2 text-sm text-sf-text-300 mb-2">
            <ArrowLeft size={14} />
            <span>Used by</span>
          </div>
          {dependencies.usedBy.length > 0 ? (
            <div className="space-y-1">
              {dependencies.usedBy.map((dep, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelection({ category: dep.category, block: dep.block })}
                  className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-sf-bg-700"
                >
                  <span className="text-sf-text-400">{dep.category}:</span>
                  <span className="text-sf-text-200">{dep.block}</span>
                  <span className="text-sf-text-400 text-xs ml-1">({dep.stage})</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sf-text-400 italic pl-6">Not referenced by any block</p>
          )}
        </div>
      </div>

      {/* Actions - placeholder for future functionality */}
      {generationState.status === 'generating' && (
        <div className="p-3 border-t border-sf-bg-600">
          <div className="flex items-center justify-center gap-2 text-sm text-sf-accent-400">
            <Loader2 size={14} className="animate-spin" />
            <span>Generating...</span>
          </div>
        </div>
      )}
    </div>
  );
}
