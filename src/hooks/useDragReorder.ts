import { useState, type DragEvent } from 'react';

interface UseDragReorderResult {
  draggedIndex: number | null;
  dragOverIndex: number | null;
  handleDragStart: (e: DragEvent, index: number) => void;
  handleDragOver: (e: DragEvent, index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (e: DragEvent, index: number) => void;
  handleDragEnd: () => void;
  /** CSS class string for the item at the given index */
  dragClasses: (index: number) => string;
}

/**
 * Generic drag-and-drop reorder hook.
 *
 * @param onReorder Called with (fromIndex, toIndex) when a drop completes.
 * @param opts.stopPropagation Whether to call e.stopPropagation() on start/over/drop (default: false).
 */
export function useDragReorder(
  onReorder: (fromIndex: number, toIndex: number) => void,
  opts?: { stopPropagation?: boolean },
): UseDragReorderResult {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const stop = opts?.stopPropagation ?? false;

  const handleDragStart = (e: DragEvent, index: number) => {
    if (stop) e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    setDraggedIndex(index);
  };

  const handleDragOver = (e: DragEvent, index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    e.preventDefault();
    if (stop) e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: DragEvent, index: number) => {
    e.preventDefault();
    if (stop) e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      onReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const dragClasses = (index: number): string => {
    const parts: string[] = [];
    if (draggedIndex === index) parts.push('opacity-50');
    if (dragOverIndex === index) parts.push('ring-2 ring-sf-accent-500');
    return parts.join(' ');
  };

  return {
    draggedIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    dragClasses,
  };
}

