import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildServer } from './index';

/**
 * What a browser is told about cross-origin access. The API is public and unauthenticated
 * today, but the allowlist is still the thing that keeps an arbitrary site from calling it on
 * a visitor's behalf, and it is easy to break in a dependency upgrade without any other test
 * noticing: resolveCorsOrigin is unit-tested, but nothing else exercised the headers.
 */
const APP = 'https://angalia.example';
const PREVIEW = 'https://angalia-preview.example';
const FOREIGN = 'https://evil.example';

afterEach(() => vi.unstubAllEnvs());

async function serverAllowing(origins: string) {
  vi.stubEnv('CORS_ORIGIN', origins);
  return buildServer({ logger: false, rateLimit: false });
}

const PREFLIGHT = {
  'access-control-request-method': 'POST',
  'access-control-request-headers': 'content-type',
} as const;

describe('CORS', () => {
  it('lets an allowed origin read a response', async () => {
    const app = await serverAllowing(APP);
    const res = await app.inject({ method: 'GET', url: '/health', headers: { origin: APP } });

    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(APP);
    // The answer depends on the Origin header, so a shared cache must not reuse it.
    expect(String(res.headers.vary).toLowerCase()).toContain('origin');
  });

  it('gives a foreign origin nothing to read the response with', async () => {
    const app = await serverAllowing(APP);
    const res = await app.inject({ method: 'GET', url: '/health', headers: { origin: FOREIGN } });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the preflight the web app triggers for POST /analyze', async () => {
    const app = await serverAllowing(APP);
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/analyze',
      headers: { origin: APP, ...PREFLIGHT },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(APP);
    expect(String(res.headers['access-control-allow-methods'])).toContain('POST');
    expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain(
      'content-type',
    );
  });

  it('does not grant a preflight to a foreign origin', async () => {
    const app = await serverAllowing(APP);
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/analyze',
      headers: { origin: FOREIGN, ...PREFLIGHT },
    });

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('takes a list of origins and refuses one that is not on it', async () => {
    const app = await serverAllowing(`${APP}, ${PREVIEW}`);
    const allowed = async (origin: string) =>
      (await app.inject({ method: 'GET', url: '/health', headers: { origin } })).headers[
        'access-control-allow-origin'
      ];

    expect(await allowed(APP)).toBe(APP);
    expect(await allowed(PREVIEW)).toBe(PREVIEW);
    expect(await allowed(FOREIGN)).toBeUndefined();
  });

  it('never answers with a wildcard while an allowlist is configured', async () => {
    const app = await serverAllowing(APP);
    for (const origin of [APP, FOREIGN, 'null']) {
      const res = await app.inject({ method: 'GET', url: '/health', headers: { origin } });
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    }
  });

  it('does not match an origin that only starts like an allowed one', async () => {
    const app = await serverAllowing(APP);
    for (const origin of [`${APP}.evil.example`, `${APP}:8443`, APP.replace('https', 'http')]) {
      const res = await app.inject({ method: 'GET', url: '/health', headers: { origin } });
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
});
