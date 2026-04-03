import { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Hint } from '../Hint';
import { validateName } from '../../utils/nameValidation';
import { useDragReorder } from '../../hooks/useDragReorder';
import { useInlineEdit } from '../../hooks/useInlineEdit';

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
  const [createError, setCreateError] = useState<string | null>(null);
  const drag = useDragReorder(onStageReorder);
  const edit = useInlineEdit(onStageRename);

  const handleCreate = () => {
    const name = newStageName.trim();
    const result = validateName(name);
    if (!result.valid) {
      setCreateError(result.error ?? 'Invalid name');
      return;
    }
    onStageCreate(name);
    onStageSelect(name);
    setNewStageName('');
    setShowNewStage(false);
    setCreateError(null);
  };

  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-sf-bg-600 overflow-x-auto">
      {stages.map((stage, index) =>
        edit.editingItem === stage ? (
          <div key={stage} className="flex flex-col">
            <input
              {...edit.inputProps(stage)}
              onClick={(e) => e.stopPropagation()}
              className={`input text-sm py-0.5 px-2 w-24 ${edit.nameError ? 'border-red-500' : ''}`}
            />
            {edit.nameError && (
              <div className="text-xs text-red-400 mt-1 px-1 whitespace-nowrap">{edit.nameError}</div>
            )}
          </div>
        ) : (
          <button
            key={stage}
            draggable
            onDragStart={(e) => drag.handleDragStart(e, index)}
            onDragEnd={drag.handleDragEnd}
            onDragOver={(e) => drag.handleDragOver(e, index)}
            onDragLeave={drag.handleDragLeave}
            onDrop={(e) => drag.handleDrop(e, index)}
            onClick={() => onStageSelect(stage)}
            onDoubleClick={() => edit.startEditing(stage)}
            className={`group flex items-center gap-1 px-2 py-1 text-sm rounded transition-colors whitespace-nowrap ${
              activeStage === stage
                ? 'bg-sf-bg-700 text-sf-text-100'
                : 'text-sf-text-300 hover:text-sf-text-200 hover:bg-sf-bg-700/50'
            } ${drag.dragClasses(index)}`}
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
            onChange={(e) => { setNewStageName(e.target.value); setCreateError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') {
                setShowNewStage(false);
                setNewStageName('');
                setCreateError(null);
              }
            }}
            placeholder="stage_name"
            className={`input text-sm py-0.5 px-2 w-24 ${createError ? 'border-red-500' : ''}`}
            autoFocus
          />
          {createError && (
            <div className="text-xs text-red-400 mt-1 px-1 whitespace-nowrap">{createError}</div>
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
