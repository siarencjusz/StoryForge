import { TreePanel } from './components/TreePanel';
import { EditorPanel } from './components/EditorPanel';
import { DependencyPanel } from './components/DependencyPanel';
import { useProjectStore } from './store/projectStore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { openProjectFile, saveProjectFile, saveProjectFileAs } from './utils/fileUtils';

function App() {
  const { project, isDirty, newProject, loadProject, setDirty, getProjectForExport, secondarySelection, setSecondarySelection } = useProjectStore();
  const [fileName, setFileName] = useState<string | null>(null);

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
    const title = prompt('Project title:', 'Untitled Project');
    if (title !== null) {
      newProject(title, '');
      setFileName(null);
    }
  }, [isDirty, newProject]);

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
    if (fileName) {
      // Save to existing file (via download since we can't write directly)
      saveProjectFile(projectData, fileName);
      setDirty(false);
    } else {
      // Save As
      const newFileName = await saveProjectFileAs(projectData);
      if (newFileName) {
        setFileName(newFileName);
        setDirty(false);
      }
    }
  }, [fileName, getProjectForExport, setDirty]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') {
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
  }, [handleSave, handleOpen, handleNew]);

  // Initialize with a demo project for development
  useEffect(() => {
    newProject('My Story', 'Author');

    // Add some demo content
    const store = useProjectStore.getState();
    store.createCategory('prompts');
    store.createBlock('prompts', 'generate_character');
    store.addStage('prompts', 'generate_character', 'output', `Create a detailed character sheet including:
- Name and aliases
- Physical appearance
- Personality traits and flaws
- Background and motivations`);
    store.addVersion('prompts', 'generate_character', 'output', 'v1', `Create a detailed character sheet including:
- Name and aliases
- Physical appearance
- Personality traits and flaws
- Background and motivations`);
    store.selectVersion('prompts', 'generate_character', 'output', 'v1');

    store.createCategory('character');
    store.createBlock('character', 'alice');
    store.addStage('character', 'alice', 'raw', `### INSTRUCTION:
[prompts:generate_character]

### INPUT:
A former ranger who tracks criminals in the Whisperwood.
She has a mysterious past connected to the old dragon cults.

### RESPONSE:`);
    store.addVersion('character', 'alice', 'raw', 'v1', `Alice Thornwood, 28 years old, stands at the edge of the Whisperwood with keen eyes scanning the shadows. Her weathered leather armor bears the marks of countless pursuits through dense forest terrain.

**Physical Appearance:**
- Tall and lean, with the wiry strength of someone who lives by tracking
- Dark brown hair kept in a practical braid
- A thin scar runs along her left jawline
- Grey-green eyes that seem to catch every movement

**Personality:**
- Patient and methodical, preferring observation to action
- Struggles with trust after a betrayal in her past
- Dry sense of humor that emerges in tense moments
- Fiercely protective of the innocent

**Background:**
Former member of the Royal Rangers before the order was disbanded. Now works as a bounty hunter, though she's selective about her targets. Haunted by her connection to the dragon cults - her mother was a priestess before the Purge.`);
    store.selectVersion('character', 'alice', 'raw', 'v1');
    store.addStage('character', 'alice', 'summary', `Summarize the character in 2-3 sentences.
[alice:raw]`);

    store.createCategory('location');
    store.createBlock('location', 'whisperwood');
    store.addStage('location', 'whisperwood', 'raw', `An ancient forest that holds memories of those who enter.`);

    store.toggleCategory('prompts');
    store.toggleCategory('character');
    store.toggleCategory('location');
    store.setSelection({ category: 'character', block: 'alice' });
    store.setDirty(false);
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
          <button onClick={handleNew} className="btn btn-secondary text-sm" title="New Project (Ctrl+N)">New</button>
          <button onClick={handleOpen} className="btn btn-secondary text-sm" title="Open Project (Ctrl+O)">Open</button>
          <button onClick={handleSave} className="btn btn-primary text-sm" title="Save Project (Ctrl+S)">Save</button>
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
    </div>
  );
}

export default App;
