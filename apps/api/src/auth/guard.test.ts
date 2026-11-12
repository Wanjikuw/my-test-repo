import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { buildServer } from '../index';
import { bearerToken } from './guard';
import { TokenError, type TokenVerifier } from './verify';

const APP = 'https://angalia.example';

const verifier: TokenVerifier = async (token) => {
  if (token === 'good-token') return { id: 'user-1', email: 'ada@example.com' };
  if (token === 'outage') throw new TokenError('key set unreachable', 'unavailable');
  throw new TokenError('token rejected', 'invalid');
};

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

afterEach(() => vi.unstubAllEnvs());

async function server(auth: TokenVerifier | false = verifier) {
  vi.stubEnv('CORS_ORIGIN', APP);
  return buildServer({ logger: false, rateLimit: false, auth });
}

// The first server of a run pays for loading every plugin, which is slow on a busy machine.
// Paying it here keeps it out of the first test, which has five seconds.
beforeAll(async () => {
  await (await server()).ready();
}, 30_000);

const CLOSED = [
  ['GET', '/capabilities'],
  ['GET', '/ingredients?q=glycerin'],
  ['GET', '/ingredients/99999999-9999-4999-8999-999999999999'],
  ['POST', '/analyze'],
  ['POST', '/ocr'],
  ['POST', '/notes'],
] as const;

describe('bearerToken', () => {
  it('takes the token from a Bearer header, whatever the case of the scheme', () => {
    expect(bearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerToken('bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(bearerToken('BEARER abc-def_ghi~jkl+mno/pqr=')).toBe('abc-def_ghi~jkl+mno/pqr=');
  });

  it.each([
    ['nothing', undefined],
    ['an empty header', ''],
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['a scheme with no token', 'Bearer'],
    ['a scheme and a space', 'Bearer '],
    ['two tokens', 'Bearer abc def'],
    ['characters a token cannot hold', 'Bearer abc<script>'],
    ['a token with whitespace around it', ' Bearer abc'],
    ['an enormous header', `Bearer ${'a'.repeat(9_000)}`],
  ])('finds no token in %s', (_description, header) => {
    expect(bearerToken(header)).toBeNull();
  });
});

describe('sign-in enforcement', () => {
  it.each(CLOSED)('closes %s %s to a caller with no token', async (method, url) => {
    const app = await server();
    const res = await app.inject({ method, url });

    expect(res.statusCode).toBe(401);
    expect(res.headers['www-authenticate']).toContain('Bearer');
    expect(res.json()).toMatchObject({ error: 'Sign in to use this service.' });
    expect(res.json().requestId).toBeTruthy();
  });

  it('leaves the health check open, to a probe and to a wake-up ping', async () => {
    const app = await server();

    expect((await app.inject({ method: 'GET', url: '/health' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'HEAD', url: '/health' })).statusCode).toBe(200);
  });

  it('refuses a header that is not a Bearer token', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'GET',
      url: '/capabilities',
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('refuses a token that is not valid, and says to sign in again', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'GET',
      url: '/capabilities',
      headers: bearer('forged'),
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toBe('Your sign-in has ended. Sign in again to continue.');
    // The reason is for the log. A caller probing tokens learns nothing from it.
    expect(res.body).not.toContain('rejected');
  });

  it('lets a valid token through to the route, which then does its own checks', async () => {
    const app = await server();

    const capabilities = await app.inject({
      method: 'GET',
      url: '/capabilities',
      headers: bearer('good-token'),
    });
    expect(capabilities.statusCode).toBe(200);

    const analyze = await app.inject({
      method: 'POST',
      url: '/analyze',
      headers: bearer('good-token'),
      payload: {},
    });
    expect(analyze.statusCode).toBe(400);
  });

  it('gives the route the account that signed in', async () => {
    const app = await server();
    app.get('/whoami', async (request) => request.authUser);

    const res = await app.inject({ method: 'GET', url: '/whoami', headers: bearer('good-token') });
    expect(res.json()).toEqual({ id: 'user-1', email: 'ada@example.com' });
  });

  it('closes a route added later, until someone marks it public', async () => {
    const app = await server();
    app.get('/added-later', async () => ({ ok: true }));
    app.get('/marked-public', { config: { public: true } }, async () => ({ ok: true }));

    expect((await app.inject({ method: 'GET', url: '/added-later' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/marked-public' })).statusCode).toBe(200);
  });

  it('answers a path that does not exist with 404, not with a request for credentials', async () => {
    const app = await server();
    const res = await app.inject({ method: 'GET', url: '/nothing-here' });

    expect(res.statusCode).toBe(404);
  });

  it('reports a key set that cannot be reached as our failure, not as a sign-out', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'GET',
      url: '/capabilities',
      headers: bearer('outage'),
    });

    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe('Internal Server Error');
  });

  it('leaves every route open when told to, as tests and local development do', async () => {
    const app = await server(false);
    app.get('/whoami', async (request) => ({ user: request.authUser }));

    expect((await app.inject({ method: 'GET', url: '/capabilities' })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/whoami' })).json()).toEqual({ user: null });
  });
});

describe('sign-in enforcement and the browser', () => {
  it('still tells an allowed origin why it was refused, so the page can say so', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'POST',
      url: '/analyze',
      headers: { origin: APP },
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers['access-control-allow-origin']).toBe(APP);
  });

  it('answers the preflight for an Authorization header without asking for one', async () => {
    const app = await server();
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/analyze',
      headers: {
        origin: APP,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization, content-type',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(APP);
    expect(String(res.headers['access-control-allow-headers']).toLowerCase()).toContain(
      'authorization',
    );
    // Without this a browser asks again for almost every request the autocomplete makes.
    expect(res.headers['access-control-max-age']).toBe('600');
  });

  // The limiter guards registered routes, and CORS answers a preflight before one is reached.
  it('does not count preflights against the rate limit', async () => {
    vi.stubEnv('CORS_ORIGIN', APP);
    const app = await buildServer({
      logger: false,
      rateLimit: { max: 2, timeWindow: '1 minute' },
      auth: verifier,
    });
    const preflight = {
      origin: APP,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    };

    for (let i = 0; i < 6; i++) {
      const res = await app.inject({ method: 'OPTIONS', url: '/capabilities', headers: preflight });
      expect(res.statusCode).toBe(204);
    }
    const real = { method: 'GET', url: '/capabilities', headers: bearer('good-token') } as const;
    expect((await app.inject(real)).statusCode).toBe(200);
    expect((await app.inject(real)).statusCode).toBe(200);
    expect((await app.inject(real)).statusCode).toBe(429);
  });
});
