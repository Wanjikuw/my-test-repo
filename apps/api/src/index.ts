import Fastify, {
  type FastifyError,
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { healthRoutes } from './routes/health';
import { captureServerError, initObservability } from './observability';

export interface RateLimitSettings {
  max: number;
  timeWindow: string | number;
}

export interface ServerOptions {
  logger?: boolean;
  /** Overrides the env-derived limit. `false` disables it, for tests that need volume. */
  rateLimit?: RateLimitSettings | false;
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

export function resolveRateLimit(env: NodeJS.ProcessEnv = process.env): RateLimitSettings {
  const configured = Number(env.RATE_LIMIT_MAX);
  return {
    max: Number.isFinite(configured) && configured > 0 ? configured : 100,
    timeWindow: env.RATE_LIMIT_WINDOW ?? '1 minute',
  };
}

/**
 * Behind Fly's proxy every request arrives from the same address, so without this the
 * rate limiter buckets the entire internet together and one busy caller locks out
 * everyone. It stays off by default because trusting forwarding headers when nothing
 * sets them lets a caller spoof their own address.
 */
export function resolveTrustProxy(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TRUST_PROXY === 'true';
}

export async function buildServer(options: ServerOptions = {}): Promise<FastifyInstance> {
  const server = Fastify({
    logger: options.logger ?? true,
    trustProxy: resolveTrustProxy(),
  });

  const limits = options.rateLimit ?? resolveRateLimit();
  if (limits !== false) {
    await server.register(rateLimit, {
      max: limits.max,
      timeWindow: limits.timeWindow,
      // Fly probes health every 15s; a throttled probe would look like an outage.
      allowList: (request) => request.url === '/health',
    });
  }

  // The error body is the one thing a client always sees, so it never carries a stack or
  // a driver message. Anything the framework did not classify is assumed to be ours and
  // is reported as a bare 500; the detail goes to the log and to Sentry, keyed by
  // request id.
  server.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    request.log.error({ err: error, requestId: request.id }, 'request failed');

    if (statusCode >= 500) {
      captureServerError(error, {
        requestId: request.id,
        method: request.method,
        url: request.url,
      });
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
  initObservability();
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
