import { useState } from 'react';
import { Plus, Check, Trash2, X, Columns2, GripVertical } from 'lucide-react';
import { Hint } from '../Hint';
import { formatTokenCount } from '../../utils/tokenUtils';
import type { Stage } from '../../types';

interface OutputSectionProps {
  currentStage: Stage;
  versions: string[];
  outputTokenCount: number;
  compareVersions: [string, string] | null;
  onCompareVersionsChange: (versions: [string, string] | null) => void;
  onSelectVersion: (version: string) => void;
  onAddVersion: () => void;
  onDeleteVersion: (version: string) => void;
  onRenameVersion: (oldName: string, newName: string) => void;
  onReorderVersions: (fromIndex: number, toIndex: number) => void;
  onUpdateContent: (version: string, content: string) => void;
}

export function OutputSection({
  currentStage,
  versions,
  outputTokenCount,
  compareVersions,
  onCompareVersionsChange,
  onSelectVersion,
  onAddVersion,
  onDeleteVersion,
  onRenameVersion,
  onReorderVersions,
  onUpdateContent,
}: OutputSectionProps) {
  const [editingVersion, setEditingVersion] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleVersionClick = (version: string, e: React.MouseEvent) => {
    if (e.shiftKey && versions.length >= 2) {
      // Shift+Click: toggle comparison mode
      if (compareVersions) {
        if (compareVersions.includes(version)) {
          onCompareVersionsChange(null);
        } else {
          onCompareVersionsChange([compareVersions[0], version]);
        }
      } else {
        const selected = currentStage.selected;
        if (selected && selected !== version) {
          onCompareVersionsChange([selected, version]);
        }
      }
    } else {
      // Normal click: select version, exit comparison mode
      onSelectVersion(version);
      onCompareVersionsChange(null);
    }
  };

  const handleRenameVersion = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      onRenameVersion(oldName, newName.trim());
    }
    setEditingVersion(null);
    setEditingVersionName('');
  };

  const handleDeleteVersion = (version: string) => {
    const confirmed = window.confirm(`Delete version "${version}"? This cannot be undone.`);
    if (!confirmed) return;

    onDeleteVersion(version);

    // If we deleted the selected version, select another one
    if (currentStage.selected === version) {
      const remaining = versions.filter(v => v !== version);
      if (remaining.length > 0) {
        onSelectVersion(remaining[0]);
      }
    }
  };

  const isInComparison = (version: string) => compareVersions?.includes(version) ?? false;

  return (
    <div className="flex-1 flex flex-col p-3 overflow-hidden">
      {/* Header */}
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
          {!compareVersions && outputTokenCount > 0 && (
            <span className="text-xs text-sf-text-400 font-mono">
              ({formatTokenCount(outputTokenCount)} tokens)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {compareVersions ? (
            <button
              onClick={() => onCompareVersionsChange(null)}
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
        {versions.map((version, index) =>
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
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', version);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  onReorderVersions(draggedIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
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
              } ${draggedIndex === index ? 'opacity-50' : ''} ${
                dragOverIndex === index ? 'ring-2 ring-sf-accent-500' : ''
              }`}
            >
              <GripVertical size={10} className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
              {version}
              {currentStage.selected === version && !compareVersions && <Check size={12} />}
              {isInComparison(version) && <Columns2 size={12} />}
            </button>
          )
        )}
        <Hint hint="editor-add-version" position="bottom">
          <button
            onClick={onAddVersion}
            className="px-2 py-0.5 text-xs bg-sf-bg-700 text-sf-text-300 hover:bg-sf-bg-600 rounded"
          >
            <Plus size={12} />
          </button>
        </Hint>
        {/* Delete selected version button */}
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
                      onSelectVersion(version);
                      onCompareVersionsChange(null);
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
                  onChange={(e) => onUpdateContent(version, e.target.value)}
                  className="textarea w-full flex-1"
                  placeholder="Content..."
                />
              </div>
            ))}
          </div>
        ) : currentStage.selected && currentStage.output[currentStage.selected] !== undefined ? (
          <textarea
            value={currentStage.output[currentStage.selected]}
            onChange={(e) => onUpdateContent(currentStage.selected, e.target.value)}
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
  );
}

