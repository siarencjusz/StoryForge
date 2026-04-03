import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  children: ReactNode;
  onClose: () => void;
  /** Extra classes for the inner panel (width, max-height, etc.) */
  className?: string;
}

/**
 * Reusable modal overlay with Escape-key and click-outside handling.
 */
export function Modal({ children, onClose, className }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click-outside (click on backdrop)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className={`bg-sf-bg-800 rounded-lg shadow-xl border border-sf-bg-600 ${className ?? ''}`}>
        {children}
      </div>
    </div>
  );
}

