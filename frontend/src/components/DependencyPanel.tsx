import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useMemo } from 'react';

// Simple reference parser
const REFERENCE_PATTERN = /\[([a-zA-Z_][a-zA-Z0-9_]*(?::[a-zA-Z_][a-zA-Z0-9_]*){0,2})]/g;

function parseReferences(text: string): string[] {
  const matches = text.matchAll(REFERENCE_PATTERN);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function DependencyPanel() {
  const { selection, getBlock, project, setSelection } = useProjectStore();

  // Calculate dependencies
  const dependencies = useMemo(() => {
    if (!selection) return { uses: [], usedBy: [] };

    const { category, block } = selection;
    const blockData = getBlock(category, block);

    // Find references this block uses
    const uses: Array<{ ref: string; category?: string; block: string; stage?: string }> = [];
    if (blockData) {
      for (const [, stageData] of Object.entries(blockData)) {
        const refs = parseReferences(stageData.input || '');
        for (const ref of refs) {
          const parts = ref.split(':');
          if (parts.length === 1) {
            uses.push({ ref, block: parts[0] });
          } else if (parts.length === 2) {
            // Could be category:block or block:stage
            uses.push({ ref, category: parts[0], block: parts[1] });
          } else if (parts.length === 3) {
            uses.push({ ref, category: parts[0], block: parts[1], stage: parts[2] });
          }
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

    return { uses, usedBy };
  }, [selection, project.blocks, getBlock]);

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
                    if (dep.category) {
                      setSelection({ category: dep.category, block: dep.block });
                    }
                  }}
                  className="block w-full text-left px-2 py-1 text-sm rounded hover:bg-sf-bg-700 text-sf-accent-500"
                >
                  [{dep.ref}]
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

      {/* Actions */}
      <div className="p-3 border-t border-sf-bg-600 space-y-2">
        <button className="btn btn-primary w-full">
          Regenerate
        </button>
      </div>
    </div>
  );
}
