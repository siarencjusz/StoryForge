/**
 * LLM Configuration Types
 */

/** LLM provider configuration */
export interface LLMConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
}

/** Chat message format (OpenAI compatible) */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
}
