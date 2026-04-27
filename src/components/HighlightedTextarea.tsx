import { useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { getInputSegments, getCommentSegments } from '../utils/referenceUtils';
import type { Blocks } from '../types';

interface HighlightedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  /** When omitted, only comment lines are highlighted (used for output textareas). */
  blocks?: Blocks;
  placeholder?: string;
  className?: string;
}

/**
 * Textarea with inline reference coloring.
 *
 * Uses the "auto-sized textarea inside a scrollable parent" pattern:
 * - The textarea grows to fit ALL content (overflow: hidden, no scrollbar)
 * - A backdrop div behind it renders the same text with colors
 * - The PARENT div provides the scrollbar
 *
 * Because neither the textarea nor the backdrop has its own scrollbar,
 * both always share identical content-area widths and therefore identical
 * line-wrapping — eliminating the cursor-position mismatch bug.
 */
export function HighlightedTextarea({
  value,
  onChange,
  blocks,
  placeholder,
  className = '',
}: HighlightedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(
    () => (blocks ? getInputSegments(value, blocks) : getCommentSegments(value)),
    [value, blocks]
  );

  // Auto-resize textarea to content height so it never needs its own scrollbar.
  const resizeTextarea = () => {
    const ta = textareaRef.current;
    const scroll = scrollRef.current;
    if (!ta || !scroll) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, scroll.clientHeight)}px`;
  };

  // Re-measure on value change
  useLayoutEffect(resizeTextarea, [value]);

  // Re-measure when the outer container resizes (e.g. user drags the resize handle)
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const observer = new ResizeObserver(resizeTextarea);
    observer.observe(scroll);
    return () => observer.disconnect();
  }, []);

  // Ctrl+/ (or Cmd+/) toggles `# ` comment prefix on the selected line(s).
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.key === '/' && (e.ctrlKey || e.metaKey))) return;
    e.preventDefault();

    const ta = e.currentTarget;
    const { selectionStart, selectionEnd } = ta;

    // Expand selection to whole-line range.
    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selectionEnd);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');

    // Toggle: if every non-empty line is already commented (single `#`), uncomment all; else comment all.
    const nonEmpty = lines.filter(l => l.trim().length > 0);
    const allCommented = nonEmpty.length > 0 && nonEmpty.every(l => /^\s*#(?!#)/.test(l));

    const newLines = lines.map(line => {
      if (allCommented) {
        // Remove leading `# ` or `#` (single hash only)
        return line.replace(/^(\s*)#(?!#)[ \t]?/, '$1');
      }
      // Skip fully empty lines when commenting
      if (line.length === 0) return line;
      return `# ${line}`;
    });

    const newBlock = newLines.join('\n');
    const newValue = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);

    onChange(newValue);

    // Restore selection across the (possibly resized) block.
    const newLineEnd = lineStart + newBlock.length;
    requestAnimationFrame(() => {
      const cur = textareaRef.current;
      if (!cur) return;
      cur.selectionStart = lineStart;
      cur.selectionEnd = newLineEnd;
    });
  };

  // Shared typography — must be identical on both elements
  const sharedStyle: React.CSSProperties = {
    lineHeight: '1.5',
    letterSpacing: '0',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    whiteSpace: 'pre-wrap',
    tabSize: 4,
  };

  return (
    <div ref={scrollRef} className={`overflow-y-auto ${className}`} style={{ minHeight: 0 }}>
      <div className="relative" style={{ minHeight: '100%' }}>
        {/* Backdrop: colored reference text */}
        {value && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none rounded border border-transparent px-3 py-2 font-mono text-sm"
            style={sharedStyle}
          >
            {segments.map((seg, i) => (
              <span
                key={i}
                className={
                  seg.type === 'resolved' ? 'text-green-400'
                  : seg.type === 'ambiguous' ? 'text-amber-400'
                  : seg.type === 'error' ? 'text-red-400'
                  : seg.type === 'comment' ? 'text-[#484f58] italic'
                  : 'text-sf-text-200'
                }
              >
                {seg.text}
              </span>
            ))}
          </div>
        )}

        {/* Textarea: auto-sized to content, no own scrollbar */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="textarea w-full resize-none relative z-10"
          style={{
            ...sharedStyle,
            overflow: 'hidden',
            background: 'transparent',
            color: value ? 'transparent' : undefined,
            caretColor: '#c9d1d9',
          }}
        />
      </div>
    </div>
  );
}
