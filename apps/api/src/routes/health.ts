import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  // Open to everyone: Render's probe, an uptime monitor and the web app's wake-up ping have no
  // account to sign in with.
  app.get('/health', { config: { public: true } }, async () => {
    return {
      status: 'ok',
      service: 'allergy-checker-api',
      timestamp: new Date().toISOString(),
    };
  });
}
