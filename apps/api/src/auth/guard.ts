import type { FastifyInstance, FastifyReply } from 'fastify';
import { TokenError, type AuthUser, type TokenVerifier } from './verify';

declare module 'fastify' {
  interface FastifyContextConfig {
    /** Reachable without signing in. A route that does not say so needs a valid token. */
    public?: boolean;
  }
  interface FastifyRequest {
    /** The verified caller; null on a public route, or while sign-in is not enforced. */
    authUser: AuthUser | null;
  }
}

/** Real tokens are around a kilobyte. The cap only stops a caller making us parse megabytes. */
const MAX_HEADER_CHARS = 8_192;
// RFC 6750 token68. The scheme name is case-insensitive.
const BEARER = /^bearer ([A-Za-z0-9._~+/-]+=*)$/i;

export function bearerToken(header: string | undefined): string | null {
  if (!header || header.length > MAX_HEADER_CHARS) return null;
  return BEARER.exec(header)?.[1] ?? null;
}

function refuse(reply: FastifyReply, message: string): FastifyReply {
  return reply
    .code(401)
    .header('WWW-Authenticate', 'Bearer realm="angalia"')
    .send({ error: message, requestId: reply.request.id });
}

/**
 * Every route needs a signed-in caller unless it says `config: { public: true }`, so a route
 * added later is closed until someone decides otherwise. Call this after CORS is registered:
 * hooks run in the order they were added, and a preflight has to be answered before anything
 * asks it for a token.
 *
 * A null verifier leaves everything open. That is for tests and local development only.
 */
export function registerAuth(app: FastifyInstance, verifier: TokenVerifier | null): void {
  app.decorateRequest('authUser', null);
  if (!verifier) return;

  app.addHook('onRequest', async (request, reply) => {
    // An unknown path is a 404 for everyone, not a request for credentials.
    if (request.is404 || request.routeOptions.config.public) return;

    const token = bearerToken(request.headers.authorization);
    if (!token) return refuse(reply, 'Sign in to use this service.');

    try {
      request.authUser = await verifier(token);
    } catch (cause) {
      if (cause instanceof TokenError && cause.kind === 'invalid') {
        request.log.info({ reason: cause.message }, 'sign-in token refused');
        return refuse(reply, 'Your sign-in has ended. Sign in again to continue.');
      }
      // Could not be checked, which is ours to fix: let the error handler report it.
      throw Object.assign(new Error('Sign-in could not be verified.'), { statusCode: 503 });
    }
  });
}
