import { Settings2 } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { useLLMStore } from '../store/llmStore';
import { useHintsStore } from '../store/hintsStore';
import { Hint } from './Hint';

interface HeaderProps {
  fileName: string | null;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export function Header({ fileName, onNew, onOpen, onSave, onSaveAs }: HeaderProps) {
  const { project, isDirty } = useProjectStore();
  const { setShowSettings, getActiveConfig, pingResults } = useLLMStore();
  const { showHints, setShowHints } = useHintsStore();

  return (
    <header className="h-12 bg-sf-bg-800 border-b border-sf-bg-600 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-sf-text-100">StoryForge</h1>
        <span className="text-sm text-sf-text-400">
          {project.project.title}
          {fileName && <span className="text-sf-text-400 ml-1">({fileName})</span>}
          {isDirty && <span className="text-sf-warning ml-1">•</span>}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Show Hints Checkbox */}
        <Hint hint="hint-checkbox" position="bottom">
          <label className="flex items-center gap-1.5 text-xs text-sf-text-400 cursor-pointer hover:text-sf-text-300">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(e) => setShowHints(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-sf-bg-500 bg-sf-bg-700 text-sf-accent-500 focus:ring-sf-accent-500 focus:ring-offset-0"
            />
            <span>Show hints</span>
          </label>
        </Hint>
        <div className="w-px h-6 bg-sf-bg-600" />
        {/* LLM Status Indicator */}
        <Hint hint="btn-llm-status" position="bottom">
          {(() => {
            const activeConfig = getActiveConfig();
            const pingResult = activeConfig ? pingResults[activeConfig.id] : null;
            return (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-sf-bg-700 text-sm"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    pingResult?.ok ? 'bg-green-500' : pingResult ? 'bg-red-500' : 'bg-sf-text-400'
                  }`}
                />
                <span className="text-sf-text-300">{activeConfig?.name ?? 'No LLM'}</span>
                <Settings2 size={14} className="text-sf-text-400" />
              </button>
            );
          })()}
        </Hint>
        <div className="w-px h-6 bg-sf-bg-600" />
        <Hint hint="btn-new" position="bottom">
          <button onClick={onNew} className="btn btn-secondary text-sm">New</button>
        </Hint>
        <Hint hint="btn-open" position="bottom">
          <button onClick={onOpen} className="btn btn-secondary text-sm">Open</button>
        </Hint>
        <Hint hint="btn-save" position="bottom">
          <button onClick={onSave} className="btn btn-primary text-sm">Save</button>
        </Hint>
        <Hint hint="btn-save-as" position="bottom">
          <button onClick={onSaveAs} className="btn btn-secondary text-sm">Save As</button>
        </Hint>
      </div>
    </header>
  );
}

