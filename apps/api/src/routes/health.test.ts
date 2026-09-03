import Fastify from 'fastify';
import { describe, it, expect } from 'vitest';
import { healthRoutes } from './health';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const app = Fastify();
    await app.register(healthRoutes);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('ok');
  });
});
