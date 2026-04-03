import { useState, useEffect, useCallback, type RefObject } from 'react';

interface UseResizeOptions {
  /** Direction of resize: 'horizontal' measures clientX, 'vertical' measures clientY */
  direction: 'horizontal' | 'vertical';
  /** Reference element to measure against */
  containerRef: RefObject<HTMLElement | null>;
  /** Initial size in pixels */
  initial: number;
  /** Minimum size in pixels */
  min: number;
  /** Maximum size in pixels, or a function receiving the container rect */
  max: number | ((rect: DOMRect) => number);
  /** If true, size is measured from the far edge (right / bottom) instead of the near edge (left / top) */
  reverse?: boolean;
}

interface UseResizeResult {
  /** Current size in pixels */
  size: number;
  /** Whether a resize is in progress */
  isResizing: boolean;
  /** Call this from the resize handle's onMouseDown */
  startResize: (e: React.MouseEvent) => void;
}

/**
 * Hook that manages a resize-by-drag interaction (mousedown → mousemove → mouseup).
 */
export function useResize({
  direction,
  containerRef,
  initial,
  min,
  max,
  reverse = false,
}: UseResizeOptions): UseResizeResult {
  const [size, setSize] = useState(initial);
  const [isResizing, setIsResizing] = useState(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const maxVal = typeof max === 'function' ? max(rect) : max;

      let newSize: number;
      if (direction === 'horizontal') {
        newSize = reverse ? rect.right - e.clientX : e.clientX - rect.left;
      } else {
        newSize = reverse ? rect.bottom - e.clientY : e.clientY - rect.top;
      }

      setSize(Math.max(min, Math.min(newSize, maxVal)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, containerRef, direction, min, max, reverse]);

  return { size, isResizing, startResize };
}

