import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ALERT_COOLDOWN_MS,
  captureServerError,
  initObservability,
  resolveAlertWebhook,
} from './observability';

const SLACK = 'https://hooks.slack.com/services/T0/B0/secret';
const DISCORD = 'https://discord.com/api/webhooks/1/secret';
const context = { requestId: 'req-1', method: 'POST', url: '/analyze', statusCode: 500 };

/** Records every post and answers with `respond`, so no test touches the network. */
function fakeWebhook(respond: () => Promise<Response> = async () => new Response(null)) {
  const calls: { url: string; body: Record<string, string> }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse(String(init?.body)) as Record<string, string>,
    });
    return respond();
  }) as typeof fetch;
  return { impl, calls };
}

describe('resolveAlertWebhook', () => {
  it('is off when unset or blank', () => {
    expect(resolveAlertWebhook({})).toBeNull();
    expect(resolveAlertWebhook({ ALERT_WEBHOOK_URL: '   ' })).toBeNull();
  });

  it('writes to the field each service reads', () => {
    expect(resolveAlertWebhook({ ALERT_WEBHOOK_URL: SLACK })?.field).toBe('text');
    expect(resolveAlertWebhook({ ALERT_WEBHOOK_URL: DISCORD })?.field).toBe('content');
  });

  // Anyone holding the URL can post to the channel, so plain http would publish it.
  it('refuses a URL that is not https', () => {
    expect(() =>
      resolveAlertWebhook({ ALERT_WEBHOOK_URL: 'http://hooks.slack.com/services/T0/B0/x' }),
    ).toThrow(/https/);
  });

  it('refuses a malformed URL without repeating it in the error', () => {
    let message = '';
    try {
      resolveAlertWebhook({ ALERT_WEBHOOK_URL: 'hooks.slack.com/secret' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/https/);
    expect(message).not.toContain('secret');
  });
});

describe('alert webhook', () => {
  afterEach(() => {
    initObservability({});
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('posts nothing when no webhook is configured', () => {
    const hook = fakeWebhook();
    initObservability({}, hook.impl);
    captureServerError(new Error('boom'), context);
    expect(hook.calls).toHaveLength(0);
  });

  it('posts the route, the error and the request id', () => {
    const hook = fakeWebhook();
    initObservability({ ALERT_WEBHOOK_URL: DISCORD }, hook.impl);
    captureServerError(new TypeError('x is undefined'), context);

    expect(hook.calls).toHaveLength(1);
    expect(hook.calls[0]?.url).toBe(DISCORD);
    const message = hook.calls[0]?.body.content;
    expect(message).toContain('500 on POST /analyze');
    expect(message).toContain('TypeError: x is undefined');
    expect(message).toContain('req-1');
  });

  it('keeps the credentials of a quoted connection string out of the channel', () => {
    const hook = fakeWebhook();
    initObservability({ ALERT_WEBHOOK_URL: SLACK }, hook.impl);
    captureServerError(new Error('no route to postgres://app:hunter2@db.internal:5432/x'), context);

    const message = hook.calls[0]?.body.text;
    expect(message).not.toContain('hunter2');
    expect(message).toContain('postgres://***@db.internal');
  });

  // Discord refuses a message over 2,000 characters, which would lose the alert entirely.
  it('trims a long error to fit the smaller of the two limits', () => {
    const hook = fakeWebhook();
    initObservability({ ALERT_WEBHOOK_URL: DISCORD }, hook.impl);
    captureServerError(new Error('x'.repeat(5_000)), context);
    expect(hook.calls[0]?.body.content?.length).toBeLessThanOrEqual(2_000);
  });

  it('posts once per window and counts what it held back', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(0);
    const hook = fakeWebhook();
    initObservability({ ALERT_WEBHOOK_URL: SLACK }, hook.impl);

    captureServerError(new Error('first'), context);
    captureServerError(new Error('second'), context);
    captureServerError(new Error('third'), context);
    expect(hook.calls).toHaveLength(1);

    vi.setSystemTime(ALERT_COOLDOWN_MS);
    captureServerError(new Error('fourth'), context);
    expect(hook.calls).toHaveLength(2);
    expect(hook.calls[1]?.body.text).toContain('fourth');
    expect(hook.calls[1]?.body.text).toContain('2 more since the previous alert');
  });

  // A deleted webhook answers 404; without a log line the alerts would stop silently.
  it('logs a webhook that refuses the post', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hook = fakeWebhook(async () => new Response(null, { status: 404 }));
    initObservability({ ALERT_WEBHOOK_URL: DISCORD }, hook.impl);

    captureServerError(new Error('boom'), context);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining('404')));
  });

  it('never lets an unreachable webhook fail the request that triggered it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hook = fakeWebhook(async () => {
      throw new TypeError('fetch failed');
    });
    initObservability({ ALERT_WEBHOOK_URL: DISCORD }, hook.impl);

    expect(() => captureServerError(new Error('boom'), context)).not.toThrow();
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
  });
});
