/**
 * Hint Component - Shows tutorial hints on hover after a delay
 */

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useHintsStore, HINTS } from '../store/hintsStore';

interface HintProps {
  /** The hint key from HINTS or a custom hint string */
  hint: string;
  /** The element to wrap */
  children: ReactNode;
  /** Position of the hint tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional class for the wrapper */
  className?: string;
}

export function Hint({ hint, children, position = 'bottom', className = '' }: HintProps) {
  const { showHints } = useHintsStore();
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get hint text - either from HINTS map or use as-is
  const hintText = HINTS[hint] || hint;

  const handleMouseEnter = () => {
    if (!showHints) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 2000); // 2 second delay
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hide when hints are disabled
  useEffect(() => {
    if (!showHints) {
      setIsVisible(false);
    }
  }, [showHints]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-amber-600',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-amber-600',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-amber-600',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-amber-600',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
          role="tooltip"
        >
          <div className="relative bg-amber-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-xs whitespace-normal">
            <div className="flex items-start gap-2">
              <span className="text-amber-200 shrink-0">💡</span>
              <span>{hintText}</span>
            </div>
            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
