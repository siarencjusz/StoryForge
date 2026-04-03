import { useEffect } from 'react';

/**
 * Registers global keyboard shortcuts (Ctrl+S, Ctrl+Shift+S, Ctrl+O, Ctrl+N).
 */
export function useKeyboardShortcuts({
  onSave,
  onSaveAs,
  onOpen,
  onNew,
}: {
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onNew: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's' && e.shiftKey) {
          e.preventDefault();
          onSaveAs();
        } else if (e.key === 's') {
          e.preventDefault();
          onSave();
        } else if (e.key === 'o') {
          e.preventDefault();
          onOpen();
        } else if (e.key === 'n') {
          e.preventDefault();
          onNew();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onSaveAs, onOpen, onNew]);
}

