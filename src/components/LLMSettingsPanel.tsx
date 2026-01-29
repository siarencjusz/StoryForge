/**
 * LLM Settings Panel - Modal for managing LLM configurations
 */

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Loader2, AlertCircle, Settings2 } from 'lucide-react';
import { useLLMStore } from '../store/llmStore';
import type { LLMConfig } from '../types';

interface LLMSettingsPanelProps {
  onClose: () => void;
}

export function LLMSettingsPanel({ onClose }: LLMSettingsPanelProps) {
  const {
    configs,
    activeConfigId,
    pingResults,
    addConfig,
    updateConfig,
    deleteConfig,
    setActiveConfig,
    pingConfig,
  } = useLLMStore();

  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [pingInProgress, setPingInProgress] = useState<string | null>(null);

  // Auto-ping on mount
  useEffect(() => {
    configs.forEach((config) => {
      pingConfig(config.id);
    });
  }, []);

  const handlePing = async (id: string) => {
    setPingInProgress(id);
    await pingConfig(id);
    setPingInProgress(null);
  };

  const handleAddConfig = () => {
    const id = addConfig({
      name: 'New LLM',
      endpoint: 'http://127.0.0.1:5000',
      apiKey: '',
      model: 'local-model',
      maxTokens: 2048,
      temperature: 0.7,
      isActive: false,
    });
    const newConfig = configs.find((c) => c.id === id);
    if (newConfig) {
      setEditingConfig({ ...newConfig });
    }
  };

  const handleSaveConfig = () => {
    if (editingConfig) {
      updateConfig(editingConfig.id, editingConfig);
      setEditingConfig(null);
      // Re-ping to check the new configuration
      handlePing(editingConfig.id);
    }
  };

  const handleDeleteConfig = (id: string) => {
    if (configs.length <= 1) {
      alert('Cannot delete the last configuration');
      return;
    }
    if (confirm('Delete this LLM configuration?')) {
      deleteConfig(id);
      if (editingConfig?.id === id) {
        setEditingConfig(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-sf-bg-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sf-bg-600">
          <div className="flex items-center gap-2">
            <Settings2 size={20} className="text-sf-accent-500" />
            <h2 className="text-lg font-semibold text-sf-text-100">LLM Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-600 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Config list */}
          <div className="space-y-3">
            {configs.map((config) => {
              const pingResult = pingResults[config.id];
              const isEditing = editingConfig?.id === config.id;

              return (
                <div
                  key={config.id}
                  className={`border rounded-lg p-3 ${
                    config.id === activeConfigId
                      ? 'border-sf-accent-500 bg-sf-accent-500/10'
                      : 'border-sf-bg-600'
                  }`}
                >
                  {isEditing ? (
                    /* Editing form */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-sf-text-400 mb-1">Name</label>
                          <input
                            type="text"
                            value={editingConfig.name}
                            onChange={(e) =>
                              setEditingConfig({ ...editingConfig, name: e.target.value })
                            }
                            className="input w-full text-sm"
                            placeholder="My LLM"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-sf-text-400 mb-1">Model</label>
                          <input
                            type="text"
                            value={editingConfig.model}
                            onChange={(e) =>
                              setEditingConfig({ ...editingConfig, model: e.target.value })
                            }
                            className="input w-full text-sm"
                            placeholder="gpt-4, local-model, etc."
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-sf-text-400 mb-1">Endpoint URL</label>
                        <input
                          type="text"
                          value={editingConfig.endpoint}
                          onChange={(e) =>
                            setEditingConfig({ ...editingConfig, endpoint: e.target.value })
                          }
                          className="input w-full text-sm"
                          placeholder="http://127.0.0.1:5000"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-sf-text-400 mb-1">
                          API Key (optional)
                        </label>
                        <input
                          type="password"
                          value={editingConfig.apiKey ?? ''}
                          onChange={(e) =>
                            setEditingConfig({ ...editingConfig, apiKey: e.target.value })
                          }
                          className="input w-full text-sm"
                          placeholder="sk-..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-sf-text-400 mb-1">Max Tokens</label>
                          <input
                            type="number"
                            value={editingConfig.maxTokens}
                            onChange={(e) =>
                              setEditingConfig({
                                ...editingConfig,
                                maxTokens: parseInt(e.target.value) || 2048,
                              })
                            }
                            className="input w-full text-sm"
                            min={1}
                            max={32768}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-sf-text-400 mb-1">Temperature</label>
                          <input
                            type="number"
                            value={editingConfig.temperature}
                            onChange={(e) =>
                              setEditingConfig({
                                ...editingConfig,
                                temperature: parseFloat(e.target.value) || 0.7,
                              })
                            }
                            className="input w-full text-sm"
                            min={0}
                            max={2}
                            step={0.1}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => setEditingConfig(null)}
                          className="btn btn-secondary text-sm"
                        >
                          Cancel
                        </button>
                        <button onClick={handleSaveConfig} className="btn btn-primary text-sm">
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display view */
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status indicator */}
                        <div className="flex items-center">
                          {pingInProgress === config.id ? (
                            <Loader2 size={16} className="text-sf-accent-500 animate-spin" />
                          ) : pingResult?.ok ? (
                            <div
                              className="w-3 h-3 rounded-full bg-green-500"
                              title="Connected"
                            />
                          ) : pingResult ? (
                            <div
                              className="w-3 h-3 rounded-full bg-red-500"
                              title={pingResult.error}
                            />
                          ) : (
                            <div className="w-3 h-3 rounded-full bg-sf-bg-500" title="Not tested" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sf-text-100">{config.name}</span>
                            {config.id === activeConfigId && (
                              <span className="text-xs bg-sf-accent-600 text-white px-1.5 py-0.5 rounded">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-sf-text-400">
                            {config.endpoint} • {config.model}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePing(config.id)}
                          className="btn btn-secondary text-xs py-1"
                          disabled={pingInProgress === config.id}
                        >
                          Ping
                        </button>
                        {config.id !== activeConfigId && (
                          <button
                            onClick={() => setActiveConfig(config.id)}
                            className="btn btn-secondary text-xs py-1"
                          >
                            <Check size={12} className="mr-1" />
                            Set Active
                          </button>
                        )}
                        <button
                          onClick={() => setEditingConfig({ ...config })}
                          className="p-1.5 text-sf-text-400 hover:text-sf-text-200 hover:bg-sf-bg-600 rounded"
                          title="Edit"
                        >
                          <Settings2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConfig(config.id)}
                          className="p-1.5 text-sf-text-400 hover:text-sf-error hover:bg-sf-bg-600 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Error display */}
                  {!isEditing && pingResult && !pingResult.ok && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                      <AlertCircle size={12} />
                      {pingResult.error}
                    </div>
                  )}

                  {/* Available models */}
                  {!isEditing && pingResult?.ok && pingResult.models && pingResult.models.length > 0 && (
                    <div className="mt-2 text-xs text-sf-text-400">
                      Available models: {pingResult.models.slice(0, 5).join(', ')}
                      {pingResult.models.length > 5 && ` (+${pingResult.models.length - 5} more)`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add button */}
          <button
            onClick={handleAddConfig}
            className="mt-4 w-full btn btn-secondary flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add LLM Configuration
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sf-bg-600">
          <p className="text-xs text-sf-text-400">
            Configure OpenAI-compatible API endpoints. For local LLMs, use tools like llama.cpp server,
            Ollama, or LM Studio that expose an OpenAI-compatible API.
          </p>
        </div>
      </div>
    </div>
  );
}
