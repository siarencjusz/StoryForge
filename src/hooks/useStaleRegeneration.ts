/**
 * Cascade regeneration of stale outputs.
 *
 * Walks the project's blocks in dependency (topological) order and regenerates
 * the selected output of any stage that is currently stale. Staleness is
 * recomputed live before each stage, so regenerating an upstream block naturally
 * flips its downstream dependents to stale and regenerates them too.
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useProjectStore } from '../store/projectStore';
import { useLLMStore } from '../store/llmStore';
import { resolveReferences, stripComments } from '../utils/referenceUtils';
import { computeSignature, getStageStaleness, topoSortBlocks, collectStaleStages, signatureSourceFor } from '../utils/staleness';

export function useStaleRegeneration() {
  const staleCount = useProjectStore((s) => collectStaleStages(s.project.blocks).length);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const stop = useCallback(() => {
    cancelRef.current = true;
    useLLMStore.getState().stopGeneration();
  }, []);

  const run = useCallback(async () => {
    if (running) return;

    const llm = useLLMStore.getState();
    if (!llm.getActiveConfig()) {
      llm.setShowSettings(true);
      return;
    }

    cancelRef.current = false;
    setRunning(true);
    let regenerated = 0;

    try {
      const order = topoSortBlocks(useProjectStore.getState().project.blocks);

      for (const { category, block } of order) {
        if (cancelRef.current) break;

        const blockData = useProjectStore.getState().project.blocks[category]?.[block];
        if (!blockData) continue;

        for (const stage of Object.keys(blockData)) {
          if (cancelRef.current) break;

          const store = useProjectStore.getState();
          const blocks = store.project.blocks;
          if (getStageStaleness(blocks, category, block, stage) !== 'stale') continue;

          const stageData = blocks[category][block][stage];
          const version = stageData.selected;
          if (!version) continue;

          const { resolved, errors } = resolveReferences(stripComments(stageData.input), blocks);
          if (errors.length > 0) {
            toast.error(`Skipped ${category}:${block}:${stage} — missing references`);
            continue;
          }

          const { resolved: resolvedSystem, errors: systemErrors } =
            resolveReferences(stripComments(stageData.system ?? ''), blocks);
          if (systemErrors.length > 0) {
            toast.error(`Skipped ${category}:${block}:${stage} — missing system references`);
            continue;
          }

          const signatureSource = signatureSourceFor(blocks, stageData.input, stageData.system);

          let accumulatedThinking = '';
          await new Promise<void>((resolve) => {
            useLLMStore.getState().generateStreaming(
              resolved,
              (_token, fullContent) =>
                store.updateVersionContent(category, block, stage, version, fullContent),
              (content) => {
                store.updateVersionContent(category, block, stage, version, content);
                store.setVersionSignature(category, block, stage, version, computeSignature(signatureSource));
                resolve();
              },
              (error) => {
                toast.error(`Failed ${block}:${stage}: ${error}`);
                resolve();
              },
              undefined,
              (thinkToken) => {
                accumulatedThinking += thinkToken;
                store.updateVersionThinking(category, block, stage, version, accumulatedThinking);
              },
              resolvedSystem || undefined
            );
          });

          regenerated++;
        }
      }

      if (cancelRef.current) {
        toast.info(`Cascade stopped after ${regenerated} regeneration${regenerated === 1 ? '' : 's'}`);
      } else if (regenerated > 0) {
        toast.success(`Regenerated ${regenerated} stale output${regenerated === 1 ? '' : 's'}`);
      }
    } finally {
      setRunning(false);
    }
  }, [running]);

  return { staleCount, running, run, stop };
}
