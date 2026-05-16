import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Brain, Copy, Check } from 'lucide-react';

interface ThinkingPreviewProps {
  content: string;
  isStreaming: boolean;
}

/**
 * Collapsible panel that shows the model's reasoning / thinking content.
 * Auto-expands while the model is streaming thinking tokens, collapses when done.
 */
export function ThinkingPreview({ content, isStreaming }: ThinkingPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-expand when streaming starts, collapse when it stops
  useEffect(() => {
    setExpanded(isStreaming);
  }, [isStreaming]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isStreaming && expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [content, isStreaming, expanded]);

  if (!content) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-3 mb-2 rounded border border-sf-bg-600 bg-sf-bg-800/50 text-xs">
      {/* Header */}
      <div
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded((v) => !v); }}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-sf-bg-700/50 transition-colors rounded cursor-pointer select-none"
      >
        <Brain size={12} className="text-purple-400 shrink-0" />
        <span className="text-purple-300 font-medium">
          Thinking
          {isStreaming && (
            <span className="ml-2 inline-flex gap-0.5">
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-600 rounded"
            title={copied ? 'Copied!' : 'Copy thinking content'}
          >
            {copied ? <Check size={12} className="text-sf-success" /> : <Copy size={12} />}
          </button>
          <span className="text-sf-text-500">
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </span>
        </span>
      </div>

      {/* Content */}
      {expanded && (
        <div
          ref={scrollRef}
          className="px-3 pb-2 max-h-48 overflow-y-auto border-t border-sf-bg-600"
        >
          <pre
            className="mt-2 text-[#484f58] italic font-mono text-xs whitespace-pre-wrap break-words leading-relaxed select-text"
          >
            {content}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3 bg-purple-400/60 ml-0.5 animate-pulse" />
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

