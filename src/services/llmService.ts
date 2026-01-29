/**
 * LLM Service - Handles communication with OpenAI-compatible APIs
 */

import type { LLMConfig, ChatMessage } from '../types';

/** Error thrown by LLM service */
export class LLMError extends Error {
  statusCode?: number;
  response?: string;

  constructor(
    message: string,
    statusCode?: number,
    response?: string
  ) {
    super(message);
    this.name = 'LLMError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

/** Error thrown when generation is cancelled, carries partial content */
export class LLMCancelledError extends Error {
  partialContent: string;

  constructor(partialContent: string) {
    super('Generation cancelled');
    this.name = 'LLMCancelledError';
    this.partialContent = partialContent;
  }
}


/**
 * Result from streaming completion
 */
export interface StreamingResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Send a streaming chat completion request to an OpenAI-compatible API
 * Calls onToken for each token received, allowing live display
 */
export async function sendChatCompletionStreaming(
  config: LLMConfig,
  messages: ChatMessage[],
  onToken: (token: string) => void,
  signal?: AbortSignal
): Promise<StreamingResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body = {
    model: config.model,
    messages,
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    stream: true,
    stream_options: { include_usage: true }, // Request usage stats in stream (OpenAI extension)
  };

  // Track content at function scope so it's available even if aborted
  let fullContent = '';

  try {
    const response = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new LLMError(
        `LLM API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new LLMError('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let usage: StreamingResult['usage'] | undefined;

    // Helper to process SSE lines and extract content
    const processLines = (lines: string[]) => {
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onToken(content);
            }
            // Capture usage if provided (usually in final chunk)
            if (json.usage) {
              usage = {
                promptTokens: json.usage.prompt_tokens,
                completionTokens: json.usage.completion_tokens,
                totalTokens: json.usage.total_tokens,
              };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

        processLines(lines);
      }

      // Process any remaining buffer after stream ends
      if (buffer.trim()) {
        processLines([buffer]);
      }

      return { content: fullContent, usage };
    } catch (readError) {
      // On abort or error, try to process any remaining buffer
      if (buffer.trim()) {
        try {
          processLines(buffer.split('\n'));
        } catch {
          // Ignore errors processing remaining buffer
        }
      }

      // If it's an abort, throw with partial content
      if (readError instanceof DOMException && readError.name === 'AbortError') {
        throw new LLMCancelledError(fullContent);
      }
      throw readError;
    }
  } catch (error) {
    if (error instanceof LLMError || error instanceof LLMCancelledError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      // This shouldn't happen normally as inner catch handles it, but just in case
      throw new LLMCancelledError(fullContent);
    }
    throw new LLMError(`Failed to connect to LLM API: ${(error as Error).message}`);
  }
}

/**
 * Ping an LLM endpoint to check if it's available
 */
export async function pingEndpoint(endpoint: string, apiKey?: string): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const response = await fetch(`${endpoint}/v1/models`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }

    const data = await response.json();
    const models = data.data?.map((m: { id: string }) => m.id) ?? [];
    return { ok: true, models };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
