import { describe, it, expect } from 'vitest';
import { buildServer, resolveCorsOrigin, resolveRateLimit, resolveTrustProxy } from './index';

describe('resolveCorsOrigin', () => {
  it('uses the configured allowlist', () => {
    expect(resolveCorsOrigin({ CORS_ORIGIN: 'https://a.test, https://b.test' })).toEqual([
      'https://a.test',
      'https://b.test',
    ]);
  });

  it('ignores empty entries left by a trailing comma', () => {
    expect(resolveCorsOrigin({ CORS_ORIGIN: 'https://a.test,,' })).toEqual(['https://a.test']);
  });

  it('reflects any origin in development, where that is a convenience', () => {
    expect(resolveCorsOrigin({ NODE_ENV: 'development' })).toBe(true);
  });

  // Failing open here would expose the API to every website the moment auth lands.
  it('refuses to start in production without an allowlist', () => {
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN must be set/);
  });

  it('refuses a production allowlist that is only whitespace', () => {
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production', CORS_ORIGIN: '  ,  ' })).toThrow();
  });
});

describe('error handler', () => {
  const withRoutes = async () => {
    const server = await buildServer({ logger: false, rateLimit: false });
    server.get('/boom', async () => {
      throw new Error('connection string postgres://user:hunter2@db.internal');
    });
    server.get('/bad', async () => {
      const err = new Error('inciNames must not be empty') as Error & { statusCode?: number };
      err.statusCode = 400;
      throw err;
    });
    return server;
  };

  it('never returns the internal detail of a 500 to the client', async () => {
    const server = await withRoutes();
    const res = await server.inject({ method: 'GET', url: '/boom' });

    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain('hunter2');
    expect(res.body).not.toContain('postgres://');
    expect(res.json().error).toBe('Internal Server Error');
  });

  it('keeps a client-error message, which describes the caller input not ours', async () => {
    const server = await withRoutes();
    const res = await server.inject({ method: 'GET', url: '/bad' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('inciNames must not be empty');
  });

  it('returns a request id so a log line can be found for the opaque 500', async () => {
    const server = await withRoutes();
    const res = await server.inject({ method: 'GET', url: '/boom' });
    expect(res.json().requestId).toBeTruthy();
  });

  it('still serves health', async () => {
    const server = await buildServer({ logger: false, rateLimit: false });
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});

describe('resolveRateLimit', () => {
  it('defaults to a limit rather than leaving the API unprotected', () => {
    expect(resolveRateLimit({}).max).toBe(100);
  });

  it('honours configured values', () => {
    expect(resolveRateLimit({ RATE_LIMIT_MAX: '25', RATE_LIMIT_WINDOW: '10 seconds' })).toEqual({
      max: 25,
      timeWindow: '10 seconds',
    });
  });

  it('ignores a nonsensical limit rather than blocking every request', () => {
    expect(resolveRateLimit({ RATE_LIMIT_MAX: '0' }).max).toBe(100);
    expect(resolveRateLimit({ RATE_LIMIT_MAX: 'lots' }).max).toBe(100);
  });
});

describe('resolveTrustProxy', () => {
  // Trusting forwarding headers when nothing sets them lets a caller spoof their address
  // and sidestep the rate limiter entirely.
  it('is off unless explicitly enabled', () => {
    expect(resolveTrustProxy({})).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: 'false' })).toBe(false);
  });

  it('is on when the deployment declares it sits behind a proxy', () => {
    expect(resolveTrustProxy({ TRUST_PROXY: 'true' })).toBe(true);
  });
});

describe('rate limiting', () => {
  it('rejects once the window budget is spent', async () => {
    const server = await buildServer({
      logger: false,
      rateLimit: { max: 2, timeWindow: '1 minute' },
    });
    server.get('/ping', async () => ({ ok: true }));

    const first = await server.inject({ method: 'GET', url: '/ping' });
    const second = await server.inject({ method: 'GET', url: '/ping' });
    const third = await server.inject({ method: 'GET', url: '/ping' });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(third.statusCode).toBe(429);
  });

  // Fly probes health every 15 seconds; a throttled probe would read as an outage.
  it('never throttles the health check', async () => {
    const server = await buildServer({
      logger: false,
      rateLimit: { max: 1, timeWindow: '1 minute' },
    });

    for (let i = 0; i < 5; i++) {
      const res = await server.inject({ method: 'GET', url: '/health' });
      expect(res.statusCode).toBe(200);
    }
  });

  it('can be disabled for callers that need volume', async () => {
    const server = await buildServer({ logger: false, rateLimit: false });
    server.get('/ping', async () => ({ ok: true }));

    for (let i = 0; i < 10; i++) {
      const res = await server.inject({ method: 'GET', url: '/ping' });
      expect(res.statusCode).toBe(200);
    }
  });
});
