import { describe, it, expect } from 'vitest';
import { buildServer, resolveCorsOrigin } from './index';

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
    const server = await buildServer({ logger: false });
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
    const server = await buildServer({ logger: false });
    const res = await server.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });
});
