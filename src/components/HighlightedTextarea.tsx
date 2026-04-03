import { useRef, useCallback, useMemo } from 'react';
import { getInputSegments } from '../utils/referenceUtils';
import type { Blocks } from '../types';

interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  blocks: Blocks;
  placeholder?: string;
  className?: string;
}

/**
 * A textarea with an overlay that highlights template references:
 * - Green for correctly resolved references
 * - Red for missing/unresolved references
 *
 * Uses the backdrop overlay pattern: a styled div renders behind a
 * transparent-text textarea so the colored highlights show through
 * while the textarea remains fully editable.
 */
export function HighlightedTextarea({
  value,
  onChange,
  blocks,
  placeholder,
  className = '',
}: HighlightedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync scroll from textarea to backdrop
  const handleScroll = useCallback(() => {
    if (backdropRef.current && textareaRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Compute highlighted segments
  const segments = useMemo(() => getInputSegments(value, blocks), [value, blocks]);

  // Shared typography styles so backdrop & textarea render text identically.
  // Any difference in font-weight, line-height, letter-spacing, or overflow
  // will cause the cursor position to diverge from the visible text.
  const sharedStyle: React.CSSProperties = {
    lineHeight: '1.5',
    letterSpacing: '0',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    tabSize: 4,
  };

  return (
    <div className={`relative ${className}`} style={{ minHeight: 0 }}>
      {/* Backdrop: renders colored text behind the transparent textarea */}
      {value && (
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="absolute inset-0 overflow-y-scroll pointer-events-none rounded border border-transparent px-3 py-2 font-mono text-sm text-sf-text-200 highlight-backdrop"
          style={sharedStyle}
        >
          {segments.map((seg, i) => {
            if (seg.type === 'plain') {
              return <span key={i}>{seg.text}</span>;
            }
            return (
              <span
                key={i}
                className={
                  seg.type === 'resolved'
                    ? 'text-green-400'
                    : 'text-red-400'
                }
              >
                {seg.text}
              </span>
            );
          })}
        </div>
      )}

      {/* Editable textarea on top with transparent text — caret stays visible */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className="textarea w-full h-full relative z-10 resize-none"
        style={{
          ...sharedStyle,
          background: 'transparent',
          color: value ? 'transparent' : undefined,
          caretColor: '#c9d1d9',
        }}
      />
    </div>
  );
}
