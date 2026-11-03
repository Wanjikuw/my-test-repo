import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyze, ApiError, searchIngredients, wakeApi } from './api';

const INPUT = {
  label: 'Aqua, Glycerin',
  skinType: null,
  sunExposure: null,
  declaredAllergies: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** A fetch that never answers on its own, and rejects the way a browser does when aborted. */
function stalledFetch() {
  return vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (init?.signal?.aborted) abort();
        else init?.signal?.addEventListener('abort', abort);
      }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('analyze', () => {
  it('returns the answer without calling onSlow when it comes quickly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ tier: 'Safe' })));
    const onSlow = vi.fn();

    await expect(analyze(INPUT, { onSlow })).resolves.toEqual({ tier: 'Safe' });
    expect(onSlow).not.toHaveBeenCalled();
  });

  it('calls onSlow once after four seconds and still delivers the answer', async () => {
    let answer: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            answer = resolve;
          }),
      ),
    );
    const onSlow = vi.fn();

    const pending = analyze(INPUT, { onSlow });
    await vi.advanceTimersByTimeAsync(3_900);
    expect(onSlow).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    expect(onSlow).toHaveBeenCalledTimes(1);

    answer(json({ tier: 'Safe' }));
    await expect(pending).resolves.toEqual({ tier: 'Safe' });
    expect(onSlow).toHaveBeenCalledTimes(1);
  });

  it('gives up after ninety seconds, aborts the request and says the service was slow', async () => {
    const fetchMock = stalledFetch();
    vi.stubGlobal('fetch', fetchMock);

    const outcome = analyze(INPUT).then(
      () => null,
      (cause: unknown) => cause,
    );
    await vi.advanceTimersByTimeAsync(90_100);

    const error = await outcome;
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toContain('did not answer in time');
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it('reports a network failure plainly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(analyze(INPUT)).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringContaining('Could not reach the service'),
    });
  });

  it('treats an answer that is not JSON as a failure rather than an empty result', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>Starting up</html>', { status: 200 })),
    );

    await expect(analyze(INPUT)).rejects.toMatchObject({
      name: 'ApiError',
      message: expect.stringContaining('could not be read'),
    });
  });

  it('shows the message the API gave for a rejected request', async () => {
    const rejection = json({ error: 'Provide exactly one of `label` or `inciNames`.' }, 400);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(rejection));

    await expect(analyze(INPUT)).rejects.toMatchObject({
      status: 400,
      message: 'Provide exactly one of `label` or `inciNames`.',
    });
  });
});

describe('searchIngredients', () => {
  it('rethrows an abort from the caller untouched, so a replaced search is not reported', async () => {
    vi.stubGlobal('fetch', stalledFetch());
    const controller = new AbortController();

    const outcome = searchIngredients('glyc', 8, controller.signal).then(
      () => null,
      (cause: unknown) => cause,
    );
    controller.abort();

    const error = await outcome;
    expect(error).toBeInstanceOf(DOMException);
    expect((error as DOMException).name).toBe('AbortError');
  });
});

describe('wakeApi', () => {
  it('sends one request that reads nothing, and swallows a failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    expect(() => wakeApi()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toMatch(/\/health$/);
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ mode: 'no-cors' });
  });
});
