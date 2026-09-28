import { describe, it, expect } from 'vitest';
import {
  DEFAULT_QWEN_BASE_URL,
  DEFAULT_QWEN_OCR_MODEL,
  DEFAULT_QWEN_TEXT_MODEL,
  extractJson,
  resolveQwenConfig,
  stripReasoning,
} from './qwen';

describe('resolveQwenConfig', () => {
  it('is off without a key, rather than failing on every request', () => {
    expect(resolveQwenConfig({})).toBeNull();
    expect(resolveQwenConfig({ QWEN_API_KEY: '   ' })).toBeNull();
  });

  it('defaults to Model Studio and the documented model names', () => {
    expect(resolveQwenConfig({ QWEN_API_KEY: 'k' })).toEqual({
      apiKey: 'k',
      baseUrl: DEFAULT_QWEN_BASE_URL,
      textModel: DEFAULT_QWEN_TEXT_MODEL,
      ocrModel: DEFAULT_QWEN_OCR_MODEL,
      timeoutMs: 30_000,
    });
  });

  it('accepts another OpenAI-compatible host and drops a trailing slash', () => {
    const config = resolveQwenConfig({
      QWEN_API_KEY: 'k',
      QWEN_BASE_URL: 'https://openrouter.ai/api/v1/',
      QWEN_TEXT_MODEL: 'qwen/qwen3-235b-a22b:free',
    });
    expect(config?.baseUrl).toBe('https://openrouter.ai/api/v1');
    expect(config?.textModel).toBe('qwen/qwen3-235b-a22b:free');
  });

  // The key is a bearer token on every call; plain http would publish it.
  it('refuses a base URL that is not https', () => {
    expect(() =>
      resolveQwenConfig({ QWEN_API_KEY: 'k', QWEN_BASE_URL: 'http://dashscope.test/v1' }),
    ).toThrow(/https/);
  });

  it('ignores a nonsensical timeout', () => {
    expect(resolveQwenConfig({ QWEN_API_KEY: 'k', QWEN_TIMEOUT_MS: 'soon' })?.timeoutMs).toBe(
      30_000,
    );
  });
});

describe('reply parsing', () => {
  it('reads JSON wrapped in a code fence', () => {
    expect(extractJson('```json\n{"items": []}\n```')).toEqual({ items: [] });
  });

  it('returns null rather than throwing on prose', () => {
    expect(extractJson('I am unable to help.')).toBeNull();
    expect(extractJson('{ not json }')).toBeNull();
  });

  it('drops a reasoning block ahead of the answer', () => {
    expect(stripReasoning('<think>hmm</think>\nAqua, Glycerin')).toBe('Aqua, Glycerin');
  });
});
