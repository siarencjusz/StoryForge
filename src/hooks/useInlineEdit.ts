import { useState, useCallback } from 'react';
import { validateName } from '../utils/nameValidation';

interface UseInlineEditResult {
  /** The item currently being edited (null when idle) */
  editingItem: string | null;
  /** The current value in the edit input */
  editingName: string;
  /** Validation error to display (null when valid) */
  nameError: string | null;
  /** Start editing an item */
  startEditing: (item: string) => void;
  /** Cancel editing without saving */
  cancelEditing: () => void;
  /** Update the editing name (clears error) */
  setEditingName: (name: string) => void;
  /**
   * Commit the edit. Validates, then calls `onRename` if the name changed.
   * Returns true if the edit was committed (or cancelled because name was unchanged).
   */
  commitEditing: (originalName: string) => boolean;
  /** Props helper for the inline `<input>` element */
  inputProps: (originalName: string) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    autoFocus: boolean;
  };
}

/**
 * Hook to manage inline-rename state with validation.
 *
 * @param onRename Called with (oldName, newName) when the user commits a valid rename.
 */
export function useInlineEdit(
  onRename: (oldName: string, newName: string) => void,
): UseInlineEditResult {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingName, setEditingNameRaw] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const startEditing = useCallback((item: string) => {
    setEditingItem(item);
    setEditingNameRaw(item);
    setNameError(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingItem(null);
    setEditingNameRaw('');
    setNameError(null);
  }, []);

  const setEditingName = useCallback((name: string) => {
    setEditingNameRaw(name);
    setNameError(null);
  }, []);

  const commitEditing = useCallback((originalName: string): boolean => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== originalName) {
      const result = validateName(trimmed);
      if (!result.valid) {
        setNameError(result.error ?? 'Invalid name');
        return false;
      }
      onRename(originalName, trimmed);
    }
    setEditingItem(null);
    setEditingNameRaw('');
    setNameError(null);
    return true;
  }, [editingName, onRename]);

  const inputProps = useCallback((originalName: string) => ({
    value: editingName,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditingNameRaw(e.target.value);
      setNameError(null);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') commitEditing(originalName);
      if (e.key === 'Escape') cancelEditing();
    },
    onBlur: () => commitEditing(originalName),
    autoFocus: true as const,
  }), [editingName, commitEditing, cancelEditing]);

  return {
    editingItem,
    editingName,
    nameError,
    startEditing,
    cancelEditing,
    setEditingName,
    commitEditing,
    inputProps,
  };
}

