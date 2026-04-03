import { useState } from 'react';
import { X, Copy, ClipboardCheck } from 'lucide-react';
import { estimateTokens, formatTokenCount } from '../../utils/tokenUtils';
import { Modal } from '../Modal';

interface PromptPreviewModalProps {
  rawInput: string;
  resolved: string;
  errors: string[];
  warnings: string[];
  onClose: () => void;
}

export function PromptPreviewModal({ rawInput, resolved, errors, warnings, onClose }: PromptPreviewModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  return (
    <Modal onClose={onClose} className="w-[80vw] max-w-4xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-sf-bg-600">
          <h2 className="text-lg font-semibold text-sf-text-100">Prompt Preview</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-sf-bg-700 rounded text-sf-text-400 hover:text-sf-text-200"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Errors if any */}
          {errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-500/50 rounded p-3">
              <h3 className="text-sm font-semibold text-red-400 mb-2">Reference Errors</h3>
              <ul className="text-sm text-red-300 list-disc list-inside">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings if any */}
          {warnings.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/50 rounded p-3">
              <h3 className="text-sm font-semibold text-amber-400 mb-2">Ambiguous References</h3>
              <ul className="text-sm text-amber-300 list-disc list-inside">
                {warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Raw Input */}
          <div>
            <h3 className="text-sm font-semibold text-sf-text-300 mb-2">Raw Input (with references)</h3>
            <pre className="bg-sf-bg-900 rounded p-3 text-sm text-sf-text-200 whitespace-pre-wrap overflow-auto max-h-48 border border-sf-bg-600">
              {rawInput || '(empty)'}
            </pre>
          </div>

          {/* Resolved Prompt */}
          <div>
            <h3 className="text-sm font-semibold text-sf-text-300 mb-2">
              Resolved Prompt (references expanded)
              <span className="ml-2 text-xs font-mono text-sf-text-400">
                ~{formatTokenCount(estimateTokens(resolved))} tokens
              </span>
            </h3>
            <pre className="bg-sf-bg-900 rounded p-3 text-sm text-sf-text-200 whitespace-pre-wrap overflow-auto max-h-96 border border-sf-bg-600">
              {resolved || '(empty)'}
            </pre>
          </div>
        </div>
        <div className="p-4 border-t border-sf-bg-600 flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(rawInput);
                setCopiedField('instruction');
                setTimeout(() => setCopiedField(null), 2000);
              }}
              className="btn btn-secondary flex items-center gap-2 text-sm"
              title="Copy the raw input (with [references] unresolved)"
            >
              {copiedField === 'instruction' ? <ClipboardCheck size={14} className="text-sf-success" /> : <Copy size={14} />}
              {copiedField === 'instruction' ? 'Copied!' : 'Copy Instruction'}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(resolved);
                setCopiedField('full');
                setTimeout(() => setCopiedField(null), 2000);
              }}
              className="btn btn-secondary flex items-center gap-2 text-sm"
              title="Copy the fully resolved prompt (references replaced with content)"
            >
              {copiedField === 'full' ? <ClipboardCheck size={14} className="text-sf-success" /> : <Copy size={14} />}
              {copiedField === 'full' ? 'Copied!' : 'Copy Instruction + Context'}
            </button>
          </div>
          <button
            onClick={onClose}
            className="btn btn-primary"
          >
            Close
          </button>
        </div>
      </Modal>
  );
}

