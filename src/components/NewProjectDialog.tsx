import { useState, useCallback } from 'react';
import { Modal } from './Modal';

interface NewProjectDialogProps {
  onConfirm: (title: string) => void;
  onClose: () => void;
}

export function NewProjectDialog({ onConfirm, onClose }: NewProjectDialogProps) {
  const [title, setTitle] = useState('Untitled Project');

  const handleConfirm = useCallback(() => {
    onConfirm(title || 'Untitled Project');
  }, [onConfirm, title]);

  return (
    <Modal onClose={onClose} className="p-6 w-96">
      <h2 className="text-lg font-semibold text-sf-text-100 mb-4">New Project</h2>
      <label className="block text-sm text-sf-text-300 mb-2">Project Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm();
          // Escape is handled by Modal
        }}
        className="w-full px-3 py-2 bg-sf-bg-700 border border-sf-bg-500 rounded text-sf-text-100 focus:outline-none focus:border-sf-accent-500 mb-4"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={handleConfirm} className="btn btn-primary">
          Create
        </button>
      </div>
    </Modal>
  );
}

