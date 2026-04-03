import { TreePanel } from './components/TreePanel';
import { EditorPanel } from './components/EditorPanel';
import { DependencyPanel } from './components/DependencyPanel';
import { LLMSettingsPanel } from './components/LLMSettingsPanel';
import { Header } from './components/Header';
import { NewProjectDialog } from './components/NewProjectDialog';
import { useProjectStore } from './store/projectStore';
import { useLLMStore } from './store/llmStore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { openProjectFile, saveProjectFile, saveProjectFileAs, clearFileHandle } from './utils/fileUtils';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useResize } from './hooks/useResize';
import { Toaster } from 'sonner';

function App() {
  const { isDirty, newProject, loadProject, setDirty, getProjectForExport, secondarySelection, setSecondarySelection } = useProjectStore();
  const { showSettings, setShowSettings } = useLLMStore();
  const [fileName, setFileName] = useState<string | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resizable panels via useResize hook
  const treeResize = useResize({
    direction: 'horizontal',
    containerRef,
    initial: 256,
    min: 150,
    max: (rect) => rect.width * 0.5,
  });

  const depResize = useResize({
    direction: 'horizontal',
    containerRef,
    initial: 256,
    min: 150,
    max: (rect) => rect.width * 0.5,
    reverse: true,
  });

  // Handler for New Project
  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Create a new project anyway?');
      if (!confirmed) return;
    }
    setShowNewProjectDialog(true);
  }, [isDirty]);

  const handleConfirmNewProject = useCallback((title: string) => {
    newProject(title, '');
    setFileName(null);
    clearFileHandle();
    setShowNewProjectDialog(false);
  }, [newProject]);

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
    }
  }, [isDirty, loadProject]);

  // Handler for Save Project
  const handleSave = useCallback(async () => {
    const projectData = getProjectForExport();
    const savedFileName = await saveProjectFile(projectData);
    if (savedFileName) {
      setFileName(savedFileName);
      setDirty(false);
    }
  }, [getProjectForExport, setDirty]);

  // Handler for Save As
  const handleSaveAs = useCallback(async () => {
    const projectData = getProjectForExport();
    const newFileName = await saveProjectFileAs(projectData);
    if (newFileName) {
      setFileName(newFileName);
      setDirty(false);
    }
  }, [getProjectForExport, setDirty]);

  // Keyboard shortcuts
  useKeyboardShortcuts({ onSave: handleSave, onSaveAs: handleSaveAs, onOpen: handleOpen, onNew: handleNew });

  // Initialize with a demo project for development (only if no project exists)
  useEffect(() => {
    const store = useProjectStore.getState();
    if (Object.keys(store.project.blocks).length > 0) return;

    import('./data/defaultProject').then(({ DEFAULT_PROJECT }) => {
      store.loadProject(DEFAULT_PROJECT);
      store.setSelection({ category: 'character', block: 'alice' });
      store.setDirty(false);
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-sf-bg-900">
      <Header
        fileName={fileName}
        onNew={handleNew}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
      />

      {/* Main content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Tree Panel */}
        <div
          className="bg-sf-bg-800 border-r border-sf-bg-600 shrink-0 overflow-hidden"
          style={{ width: treeResize.size }}
        >
          <TreePanel />
        </div>

        {/* Tree Panel Resize Handle */}
        <div
          onMouseDown={treeResize.startResize}
          className={`w-1 cursor-col-resize hover:bg-sf-accent-500/50 transition-colors shrink-0 ${
            treeResize.isResizing ? 'bg-sf-accent-500/50' : 'bg-sf-bg-600'
          }`}
        />

        {/* Editor Panel(s) */}
        <div className="flex-1 flex min-w-0">
          <div className={`bg-sf-bg-800 min-w-0 ${secondarySelection ? 'flex-1 border-r border-sf-bg-600' : 'flex-1'}`}>
            <EditorPanel />
          </div>
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
          onMouseDown={depResize.startResize}
          className={`w-1 cursor-col-resize hover:bg-sf-accent-500/50 transition-colors shrink-0 ${
            depResize.isResizing ? 'bg-sf-accent-500/50' : 'bg-sf-bg-600'
          }`}
        />

        {/* Dependency Panel */}
        <div
          className="bg-sf-bg-800 border-l border-sf-bg-600 shrink-0 overflow-hidden"
          style={{ width: depResize.size }}
        >
          <DependencyPanel />
        </div>
      </div>

      {/* LLM Settings Modal */}
      {showSettings && <LLMSettingsPanel onClose={() => setShowSettings(false)} />}

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <NewProjectDialog
          onConfirm={handleConfirmNewProject}
          onClose={() => setShowNewProjectDialog(false)}
        />
      )}

      {/* Toast notifications */}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: '#1e1e2e', border: '1px solid #3b3b4f', color: '#e0e0e0' },
        }}
      />
    </div>
  );
}

export default App;
