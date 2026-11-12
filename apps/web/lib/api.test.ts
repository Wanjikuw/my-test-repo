import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyze, ApiError, searchIngredients, wakeApi } from './api';
import { getAccessToken } from './auth/token';

// The real one reads a cookie and loads the sign-in library; here it is whatever each test says.
vi.mock('./auth/token', () => ({ getAccessToken: vi.fn() }));

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
  vi.mocked(getAccessToken).mockResolvedValue(null);
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

describe('the sign-in token', () => {
  const headersOf = (fetchMock: ReturnType<typeof vi.fn>) =>
    new Headers(fetchMock.mock.calls[0]?.[1]?.headers);

  it('goes with an analysis as a Bearer token, beside the JSON content type', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('abc.def.ghi');
    const fetchMock = vi.fn().mockResolvedValue(json({ tier: 'Safe' }));
    vi.stubGlobal('fetch', fetchMock);

    await analyze(INPUT);

    expect(headersOf(fetchMock).get('authorization')).toBe('Bearer abc.def.ghi');
    expect(headersOf(fetchMock).get('content-type')).toBe('application/json');
  });

  it('goes with a search, which is a GET', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('abc.def.ghi');
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [], total: 0, limit: 8, offset: 0 }));
    vi.stubGlobal('fetch', fetchMock);

    await searchIngredients('glyc', 8, new AbortController().signal);

    expect(headersOf(fetchMock).get('authorization')).toBe('Bearer abc.def.ghi');
  });

  it('is left off when nobody is signed in', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ tier: 'Safe' }));
    vi.stubGlobal('fetch', fetchMock);

    await analyze(INPUT);

    expect(headersOf(fetchMock).has('authorization')).toBe(false);
  });

  it('is asked for again at every request, since it is renewed while the page is open', async () => {
    vi.mocked(getAccessToken).mockResolvedValueOnce('first').mockResolvedValueOnce('second');
    const fetchMock = vi.fn().mockImplementation(async () => json({ tier: 'Safe' }));
    vi.stubGlobal('fetch', fetchMock);

    await analyze(INPUT);
    await analyze(INPUT);

    const sent = fetchMock.mock.calls.map((call) =>
      new Headers(call[1]?.headers).get('authorization'),
    );
    expect(sent).toEqual(['Bearer first', 'Bearer second']);
  });

  it('is never added to the wake-up ping, which is not allowed to carry anything', async () => {
    vi.mocked(getAccessToken).mockResolvedValue('abc.def.ghi');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchMock);

    wakeApi();
    await vi.advanceTimersByTimeAsync(0);

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('headers');
  });

  it('leaves a refusal reading as the API worded it, with the status the page acts on', async () => {
    const refusal = json({ error: 'Your sign-in has ended. Sign in again to continue.' }, 401);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refusal));

    await expect(analyze(INPUT)).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Your sign-in has ended. Sign in again to continue.',
    });
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
