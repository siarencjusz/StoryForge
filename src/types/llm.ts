/**
 * LLM Configuration Types
 */

/**
 * Reasoning/"thinking" effort for reasoning-capable models.
 * - 'default': do not send the parameter (let the server/model decide)
 * - 'none': disable or minimize thinking
 * - 'low' | 'medium' | 'high': standard OpenAI-compatible effort levels
 */
export type ReasoningEffort = 'default' | 'none' | 'low' | 'medium' | 'high';

/** LLM provider configuration */
export interface LLMConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  /** Limits how much the model "thinks" before answering (reasoning models). */
  reasoningEffort?: ReasoningEffort;
  isActive: boolean;
}


/** Generation status */
export type GenerationStatus = 'idle' | 'generating' | 'error' | 'success';

/** Token usage from API response */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Generation state for a specific block/stage */
export interface GenerationState {
  status: GenerationStatus;
  error?: string;
  abortController?: AbortController;
  lastUsage?: TokenUsage;  // Token usage from last generation
  thinkingContent?: string; // Accumulated thinking/reasoning content during generation
}
