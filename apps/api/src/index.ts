import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import cors from '@fastify/cors';
import { healthRoutes } from './routes/health';

export interface ServerOptions {
  logger?: boolean;
}

/**
 * Reflecting whatever origin asks is a development convenience. In production it would
 * let any website call this API with the user's credentials the moment auth exists, so an
 * unset allowlist is treated as a configuration error rather than as a permissive default.
 */
export function resolveCorsOrigin(env: NodeJS.ProcessEnv = process.env): string[] | boolean {
  const configured = env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) return configured;

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'CORS_ORIGIN must be set in production. Refusing to start rather than reflect any origin.',
    );
  }

  return true;
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({ logger: options.logger ?? true });

  // The error body is the one thing a client always sees, so it never carries a stack or
  // a driver message. Anything the framework did not classify is assumed to be ours and
  // is reported as a bare 500; the detail goes to the log, keyed by request id.
  server.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    request.log.error({ err: error, requestId: request.id }, 'request failed');

    if (statusCode >= 500) {
      reply.status(statusCode).send({ error: 'Internal Server Error', requestId: request.id });
      return;
    }

    reply.status(statusCode).send({ error: error.message, requestId: request.id });
  });

  await server.register(cors, { origin: resolveCorsOrigin() });
  await server.register(healthRoutes);

  return server;
}

async function main() {
  const server = await buildServer();
  const port = Number(process.env.PORT ?? 3001);
  await server.listen({ port, host: '0.0.0.0' });
}

// Guarded so importing buildServer in a test does not start a listening server.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
