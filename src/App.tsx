import { TreePanel } from './components/TreePanel';
import { EditorPanel } from './components/EditorPanel';
import { DependencyPanel } from './components/DependencyPanel';
import { LLMSettingsPanel } from './components/LLMSettingsPanel';
import { Hint } from './components/Hint';
import { useProjectStore } from './store/projectStore';
import { useLLMStore } from './store/llmStore';
import { useHintsStore } from './store/hintsStore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { openProjectFile, saveProjectFile, saveProjectFileAs, clearFileHandle } from './utils/fileUtils';
import { Settings2 } from 'lucide-react';

function App() {
  const { project, isDirty, newProject, loadProject, setDirty, getProjectForExport, secondarySelection, setSecondarySelection } = useProjectStore();
  const { showSettings, setShowSettings, getActiveConfig, pingResults } = useLLMStore();
  const { showHints, setShowHints } = useHintsStore();
  const [fileName, setFileName] = useState<string | null>(null);

  // New project dialog state
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('Untitled Project');

  // Resizable panel widths (in pixels)
  const [treePanelWidth, setTreePanelWidth] = useState(256);
  const [depPanelWidth, setDepPanelWidth] = useState(256);
  const [resizingPanel, setResizingPanel] = useState<'tree' | 'dep' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle panel resize
  useEffect(() => {
    if (!resizingPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();

      if (resizingPanel === 'tree') {
        const newWidth = e.clientX - containerRect.left;
        // Clamp between 150px and 50% of container
        const maxWidth = containerRect.width * 0.5;
        setTreePanelWidth(Math.max(150, Math.min(newWidth, maxWidth)));
      } else if (resizingPanel === 'dep') {
        const newWidth = containerRect.right - e.clientX;
        // Clamp between 150px and 50% of container
        const maxWidth = containerRect.width * 0.5;
        setDepPanelWidth(Math.max(150, Math.min(newWidth, maxWidth)));
      }
    };

    const handleMouseUp = () => {
      setResizingPanel(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingPanel]);

  // Handler for New Project
  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Create a new project anyway?');
      if (!confirmed) return;
    }
    // Show custom dialog instead of window.prompt (which doesn't work in Electron)
    setNewProjectTitle('Untitled Project');
    setShowNewProjectDialog(true);
  }, [isDirty]);

  // Handler to confirm new project creation
  const handleConfirmNewProject = useCallback(() => {
    newProject(newProjectTitle || 'Untitled Project', '');
    setFileName(null);
    clearFileHandle();
    setShowNewProjectDialog(false);
  }, [newProject, newProjectTitle]);

  // Handler for Open Project
  const handleOpen = useCallback(async () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Open another project anyway?');
      if (!confirmed) return;
    }
    const result = await openProjectFile();
    if (result) {
      loadProject(result.project);
      setFileName(result.fileName);
      // File handle is set by openProjectFile
    }
  }, [isDirty, loadProject]);

  // Handler for Save Project (save to existing file, or prompt if new)
  const handleSave = useCallback(async () => {
    const projectData = getProjectForExport();
    const savedFileName = await saveProjectFile(projectData);
    if (savedFileName) {
      setFileName(savedFileName);
      setDirty(false);
    }
  }, [getProjectForExport, setDirty]);

  // Handler for Save As (always prompt for new filename)
  const handleSaveAs = useCallback(async () => {
    const projectData = getProjectForExport();
    const newFileName = await saveProjectFileAs(projectData);
    if (newFileName) {
      setFileName(newFileName);
      setDirty(false);
    }
  }, [getProjectForExport, setDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' && e.shiftKey) {
          e.preventDefault();
          handleSaveAs();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'o') {
          e.preventDefault();
          handleOpen();
        } else if (e.key === 'n') {
          e.preventDefault();
          handleNew();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleSaveAs, handleOpen, handleNew]);

  // Initialize with a demo project for development (only if no project exists)
  useEffect(() => {
    const store = useProjectStore.getState();

    // Only initialize demo project if there are no blocks yet
    // (i.e., this is a fresh load, not a refresh with existing state)
    if (Object.keys(store.project.blocks).length > 0) {
      return; // Already have a project, don't overwrite
    }

    // Load the default demo project
    import('./data/defaultProject').then(({ DEFAULT_PROJECT }) => {
      store.loadProject(DEFAULT_PROJECT);
      store.setSelection({ category: 'character', block: 'alice' });
      store.setDirty(false);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-sf-bg-900">
      {/* Header */}
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
            <button onClick={handleNew} className="btn btn-secondary text-sm">New</button>
          </Hint>
          <Hint hint="btn-open" position="bottom">
            <button onClick={handleOpen} className="btn btn-secondary text-sm">Open</button>
          </Hint>
          <Hint hint="btn-save" position="bottom">
            <button onClick={handleSave} className="btn btn-primary text-sm">Save</button>
          </Hint>
          <Hint hint="btn-save-as" position="bottom">
            <button onClick={handleSaveAs} className="btn btn-secondary text-sm">Save As</button>
          </Hint>
        </div>
      </header>

      {/* Main content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Tree Panel */}
        <div
          className="bg-sf-bg-800 border-r border-sf-bg-600 shrink-0 overflow-hidden"
          style={{ width: treePanelWidth }}
        >
          <TreePanel />
        </div>

        {/* Tree Panel Resize Handle */}
        <div
          onMouseDown={() => setResizingPanel('tree')}
          className={`w-1 cursor-col-resize hover:bg-sf-accent-500/50 transition-colors shrink-0 ${
            resizingPanel === 'tree' ? 'bg-sf-accent-500/50' : 'bg-sf-bg-600'
          }`}
        />

        {/* Editor Panel(s) */}
        <div className="flex-1 flex min-w-0">
          {/* Primary Editor */}
          <div className={`bg-sf-bg-800 min-w-0 ${secondarySelection ? 'flex-1 border-r border-sf-bg-600' : 'flex-1'}`}>
            <EditorPanel />
          </div>

          {/* Secondary Editor (comparison) */}
          {secondarySelection && (
            <div className="flex-1 bg-sf-bg-800 min-w-0">
              <EditorPanel
                selectionOverride={secondarySelection}
                onClose={() => setSecondarySelection(null)}
                isSecondary
              />
            </div>
          )}
        </div>

        {/* Dependency Panel Resize Handle */}
        <div
          onMouseDown={() => setResizingPanel('dep')}
          className={`w-1 cursor-col-resize hover:bg-sf-accent-500/50 transition-colors shrink-0 ${
            resizingPanel === 'dep' ? 'bg-sf-accent-500/50' : 'bg-sf-bg-600'
          }`}
        />

        {/* Dependency Panel */}
        <div
          className="bg-sf-bg-800 border-l border-sf-bg-600 shrink-0 overflow-hidden"
          style={{ width: depPanelWidth }}
        >
          <DependencyPanel />
        </div>
      </div>

      {/* LLM Settings Modal */}
      {showSettings && <LLMSettingsPanel onClose={() => setShowSettings(false)} />}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-sf-bg-800 rounded-lg p-6 w-96 shadow-xl border border-sf-bg-600">
            <h2 className="text-lg font-semibold text-sf-text-100 mb-4">New Project</h2>
            <label className="block text-sm text-sf-text-300 mb-2">Project Title</label>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmNewProject();
                if (e.key === 'Escape') setShowNewProjectDialog(false);
              }}
              className="w-full px-3 py-2 bg-sf-bg-700 border border-sf-bg-500 rounded text-sf-text-100 focus:outline-none focus:border-sf-accent-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewProjectDialog(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewProject}
                className="btn btn-primary"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
