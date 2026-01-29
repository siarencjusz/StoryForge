/**
 * LLM Store - Manages LLM configurations and generation state
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LLMConfig, GenerationState, ChatMessage } from '../types';
import { sendChatCompletionStreaming, pingEndpoint, LLMCancelledError } from '../services/llmService';

// Default local LLM configuration
const DEFAULT_CONFIG: LLMConfig = {
  id: 'local-llm',
  name: 'Local LLM',
  endpoint: 'http://127.0.0.1:5000',
  apiKey: '',
  model: 'local-model',
  maxTokens: 2048,
  temperature: 0.7,
  isActive: true,
};

interface LLMStore {
  // State
  configs: LLMConfig[];
  activeConfigId: string | null;
  generationState: GenerationState;
  pingResults: Record<string, { ok: boolean; error?: string; models?: string[] }>;
  showSettings: boolean;

  // Config management
  addConfig: (config: Omit<LLMConfig, 'id'>) => string;
  updateConfig: (id: string, updates: Partial<LLMConfig>) => void;
  deleteConfig: (id: string) => void;
  setActiveConfig: (id: string) => void;
  getActiveConfig: () => LLMConfig | undefined;

  // Settings panel
  setShowSettings: (show: boolean) => void;

  // Ping
  pingConfig: (id: string) => Promise<void>;

  // Generation (streaming)
  generateStreaming: (
    messages: ChatMessage[],
    onToken: (token: string, fullContent: string) => void,
    onComplete: (content: string) => void,
    onError: (error: string) => void
  ) => Promise<void>;
  stopGeneration: () => void;
}

export const useLLMStore = create<LLMStore>()(
  persist(
    (set, get) => ({
      // Initial state
      configs: [DEFAULT_CONFIG],
      activeConfigId: DEFAULT_CONFIG.id,
      generationState: { status: 'idle' },
      pingResults: {},
      showSettings: false,

      // Config management
      addConfig: (config) => {
        const id = `llm-${Date.now()}`;
        const newConfig: LLMConfig = { ...config, id };
        set((state) => ({
          configs: [...state.configs, newConfig],
        }));
        return id;
      },

      updateConfig: (id, updates) => {
        set((state) => ({
          configs: state.configs.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteConfig: (id) => {
        set((state) => {
          const newConfigs = state.configs.filter((c) => c.id !== id);
          return {
            configs: newConfigs,
            activeConfigId: state.activeConfigId === id
              ? (newConfigs[0]?.id ?? null)
              : state.activeConfigId,
          };
        });
      },

      setActiveConfig: (id) => {
        set({ activeConfigId: id });
      },

      getActiveConfig: () => {
        const state = get();
        return state.configs.find((c) => c.id === state.activeConfigId);
      },

      // Settings panel
      setShowSettings: (show) => {
        set({ showSettings: show });
      },

      // Ping
      pingConfig: async (id) => {
        const config = get().configs.find((c) => c.id === id);
        if (!config) return;

        const result = await pingEndpoint(config.endpoint, config.apiKey);
        set((state) => ({
          pingResults: { ...state.pingResults, [id]: result },
        }));
      },

      // Generation (streaming)
      generateStreaming: async (messages, onToken, onComplete, onError) => {
        const config = get().getActiveConfig();
        if (!config) {
          onError('No active LLM configuration');
          return;
        }

        const abortController = new AbortController();
        set({
          generationState: { status: 'generating', abortController },
        });

        let fullContent = '';

        try {
          const result = await sendChatCompletionStreaming(
            config,
            messages,
            (token) => {
              fullContent += token;
              onToken(token, fullContent);
            },
            abortController.signal
          );
          // Store token usage if available from API
          const lastUsage = result.usage ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          } : undefined;
          set({ generationState: { status: 'success', lastUsage } });
          onComplete(result.content);
        } catch (error) {
          if (error instanceof LLMCancelledError) {
            // On cancel, use the partial content from the error (more accurate than our tracked fullContent)
            set({ generationState: { status: 'idle' } });
            onComplete(error.partialContent);
          } else {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            set({ generationState: { status: 'error', error: errorMessage } });
            onError(errorMessage);
          }
        }
      },

      stopGeneration: () => {
        const state = get();
        if (state.generationState.abortController) {
          state.generationState.abortController.abort();
        }
        set({ generationState: { status: 'idle' } });
      },
    }),
    {
      name: 'storyforge-llm-config',
      partialize: (state) => ({
        configs: state.configs,
        activeConfigId: state.activeConfigId,
      }),
    }
  )
);
