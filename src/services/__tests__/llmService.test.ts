import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendCompletionStreaming } from '../llmService';
import type { LLMConfig } from '../../types';

const baseConfig: LLMConfig = {
  id: 'test',
  name: 'Test',
  endpoint: 'http://localhost:1234',
  model: 'test-model',
  maxTokens: 256,
  temperature: 0.7,
  isActive: true,
};

/** Build a fake streaming SSE Response that yields a single content token. */
function makeStreamingResponse(): Response {
  const encoder = new TextEncoder();
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: [DONE]\n\n',
  ];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

/** Capture the JSON body passed to the mocked fetch. */
function mockFetchCapturingBody(): () => Record<string, unknown> {
  let captured: Record<string, unknown> = {};
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      captured = JSON.parse(init?.body as string);
      return makeStreamingResponse();
    })
  );
  return () => captured;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('sendCompletionStreaming reasoning_effort', () => {  it('omits reasoning_effort when not configured', async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(baseConfig, 'hi', () => {});
    expect(getBody()).not.toHaveProperty('reasoning_effort');
  });

  it("omits reasoning_effort when set to 'default'", async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(
      { ...baseConfig, reasoningEffort: 'default' },
      'hi',
      () => {}
    );
    expect(getBody()).not.toHaveProperty('reasoning_effort');
  });

  it.each(['none', 'low', 'medium', 'high'] as const)(
    "sends reasoning_effort='%s' when configured",
    async (effort) => {
      const getBody = mockFetchCapturingBody();
      await sendCompletionStreaming(
        { ...baseConfig, reasoningEffort: effort },
        'hi',
        () => {}
      );
      expect(getBody().reasoning_effort).toBe(effort);
    }
  );
});

describe('sendCompletionStreaming system prompt', () => {
  type Msg = { role: string; content: string };

  it('sends an explicit systemOverride as the system message and keeps prompt as user', async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(
      baseConfig,
      'Tell me a story.',
      () => {},
      undefined,
      undefined,
      undefined,
      'You are a poet.'
    );
    const messages = getBody().messages as Msg[];
    expect(messages).toEqual([
      { role: 'system', content: 'You are a poet.' },
      { role: 'user', content: 'Tell me a story.' },
    ]);
  });

  it('ignores empty/whitespace systemOverride and sends no system message', async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(
      baseConfig,
      'Just the user text.',
      () => {},
      undefined,
      undefined,
      undefined,
      '   '
    );
    const messages = getBody().messages as Msg[];
    expect(messages).toEqual([{ role: 'user', content: 'Just the user text.' }]);
  });

  it('falls back to legacy ### SYSTEM: / ### USER: parsing when no override is given', async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(
      baseConfig,
      '### SYSTEM:\nBe terse.\n### USER:\nHello',
      () => {}
    );
    const messages = getBody().messages as Msg[];
    expect(messages).toEqual([
      { role: 'system', content: 'Be terse.' },
      { role: 'user', content: 'Hello' },
    ]);
  });

  it('lets an explicit systemOverride take precedence over inline ### SYSTEM:', async () => {
    const getBody = mockFetchCapturingBody();
    await sendCompletionStreaming(
      baseConfig,
      '### SYSTEM:\nInline system.\n### USER:\nHi',
      () => {},
      undefined,
      undefined,
      undefined,
      'Override system.'
    );
    const messages = getBody().messages as Msg[];
    expect(messages[0]).toEqual({ role: 'system', content: 'Override system.' });
    // The whole prompt (including the inline tags) becomes the user message.
    expect(messages[1].role).toBe('user');
    expect(messages[1].content).toContain('### SYSTEM:');
  });
});
