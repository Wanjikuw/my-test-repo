import Fastify from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health';

const server = Fastify({
  logger: true,
});

async function main() {
  // Falls back to reflecting any origin only when CORS_ORIGIN is unset (local dev).
  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
    : true;

  await server.register(cors, { origin: corsOrigin });
  await server.register(healthRoutes);

  const port = Number(process.env.PORT ?? 3001);
  await server.listen({ port, host: '0.0.0.0' });
}

main().catch((err) => {
  server.log.error(err);
  process.exit(1);
});
