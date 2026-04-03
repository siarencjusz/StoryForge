import { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Hint } from '../Hint';
import { validateName } from '../../utils/nameValidation';

interface StageTabsProps {
  stages: string[];
  activeStage: string | null;
  onStageSelect: (stage: string) => void;
  onStageCreate: (name: string) => void;
  onStageRename: (oldName: string, newName: string) => void;
  onStageReorder: (fromIndex: number, toIndex: number) => void;
}

export function StageTabs({
  stages,
  activeStage,
  onStageSelect,
  onStageCreate,
  onStageRename,
  onStageReorder,
}: StageTabsProps) {
  const [newStageName, setNewStageName] = useState('');
  const [showNewStage, setShowNewStage] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleCreate = () => {
    const name = newStageName.trim();
    const result = validateName(name);
    if (!result.valid) {
      setNameError(result.error ?? 'Invalid name');
      return;
    }
    onStageCreate(name);
    onStageSelect(name);
    setNewStageName('');
    setShowNewStage(false);
    setNameError(null);
  };

  const handleRename = (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== oldName) {
      const result = validateName(trimmed);
      if (!result.valid) {
        setNameError(result.error ?? 'Invalid name');
        return;
      }
      onStageRename(oldName, trimmed);
      setNameError(null);
    }
    setEditingStage(null);
    setEditingStageName('');
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-sf-bg-600 overflow-x-auto">
      {stages.map((stage, index) =>
        editingStage === stage ? (
          <div key={stage} className="flex flex-col">
            <input
              type="text"
              value={editingStageName}
              onChange={(e) => { setEditingStageName(e.target.value); setNameError(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename(stage, editingStageName);
                if (e.key === 'Escape') {
                  setEditingStage(null);
                  setEditingStageName('');
                  setNameError(null);
                }
              }}
              onBlur={() => handleRename(stage, editingStageName)}
              className={`input text-sm py-0.5 px-2 w-24 ${nameError ? 'border-red-500' : ''}`}
              autoFocus
            />
            {nameError && (
              <div className="text-xs text-red-400 mt-1 px-1 whitespace-nowrap">{nameError}</div>
            )}
          </div>
        ) : (
          <button
            key={stage}
            draggable
            onDragStart={(e) => {
              setDraggedIndex(index);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', stage);
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
                onStageReorder(draggedIndex, index);
              }
              setDraggedIndex(null);
              setDragOverIndex(null);
            }}
            onClick={() => onStageSelect(stage)}
            onDoubleClick={() => {
              setEditingStage(stage);
              setEditingStageName(stage);
            }}
            className={`group flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors whitespace-nowrap ${
              activeStage === stage
                ? 'bg-sf-bg-700 text-sf-text-100'
                : 'text-sf-text-300 hover:text-sf-text-200 hover:bg-sf-bg-700/50'
            } ${draggedIndex === index ? 'opacity-50' : ''} ${
              dragOverIndex === index ? 'ring-2 ring-sf-accent-500' : ''
            }`}
          >
            <GripVertical size={12} className="text-sf-text-400 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />
            {stage}
          </button>
        )
      )}
      {showNewStage ? (
        <div className="flex flex-col">
          <input
            type="text"
            value={newStageName}
            onChange={(e) => { setNewStageName(e.target.value); setNameError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowNewStage(false);
                setNewStageName('');
                setNameError(null);
              }
            }}
            placeholder="stage_name"
            className={`input text-sm py-0.5 px-2 w-24 ${nameError ? 'border-red-500' : ''}`}
            autoFocus
          />
          {nameError && (
            <div className="text-xs text-red-400 mt-1 px-1 whitespace-nowrap">{nameError}</div>
          )}
        </div>
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
  );
}

