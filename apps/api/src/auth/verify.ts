import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AuthUser {
  id: string;
  email?: string;
}

export type TokenVerifier = (token: string) => Promise<AuthUser>;

/**
 * `invalid` means the token must not be trusted. `unavailable` means we could not tell, which
 * is our fault and not the caller's, so it is reported as a server error and not as a sign-out.
 */
export class TokenError extends Error {
  constructor(
    message: string,
    readonly kind: 'invalid' | 'unavailable',
  ) {
    super(message);
    this.name = 'TokenError';
  }
}

export interface SupabaseAuthSettings {
  /** The project URL, for example https://abcdefgh.supabase.co. */
  url: string;
  /** The legacy shared secret. Needed only while the project still signs with HS256. */
  jwtSecret?: string | undefined;
}

/**
 * Projects on signing keys use ES256 or RS256; projects on the legacy secret use HS256.
 * Anything else, `none` included, is refused before a key is looked at.
 */
const ALGORITHMS = ['ES256', 'RS256', 'EdDSA', 'HS256'];

/** Supabase's edge caches the key set for ten minutes; holding it longer would delay a revocation. */
const KEY_SET_MAX_AGE_MS = 10 * 60_000;

export function issuerFor(url: string): string {
  return `${url.replace(/\/+$/, '')}/auth/v1`;
}

function classify(cause: unknown): TokenError {
  if (cause instanceof TokenError) return cause;
  if (cause instanceof errors.JWTExpired) return new TokenError('token expired', 'invalid');
  if (cause instanceof errors.JWKSTimeout) {
    return new TokenError('key set did not answer in time', 'unavailable');
  }
  if (
    cause instanceof errors.JWTClaimValidationFailed ||
    cause instanceof errors.JWSSignatureVerificationFailed ||
    cause instanceof errors.JWSInvalid ||
    cause instanceof errors.JWTInvalid ||
    cause instanceof errors.JOSEAlgNotAllowed ||
    cause instanceof errors.JOSENotSupported ||
    cause instanceof errors.JWKSNoMatchingKey ||
    cause instanceof errors.JWKSMultipleMatchingKeys
  ) {
    return new TokenError('token rejected', 'invalid');
  }
  // A key set that could not be fetched or read, or anything unforeseen: not the caller's doing.
  return new TokenError('token could not be checked', 'unavailable');
}

/**
 * Verifies an access token issued by Supabase Auth, without calling Supabase per request.
 *
 * `keys` replaces the project's key set, so tests never touch the network.
 */
export function createSupabaseVerifier(
  settings: SupabaseAuthSettings,
  keys?: JWTVerifyGetKey,
): TokenVerifier {
  const issuer = issuerFor(settings.url);
  const jwks =
    keys ??
    createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
      timeoutDuration: 5_000,
      cooldownDuration: 30_000,
      cacheMaxAge: KEY_SET_MAX_AGE_MS,
    });
  const secret = settings.jwtSecret ? new TextEncoder().encode(settings.jwtSecret) : undefined;

  // The key is chosen by the algorithm the token claims, and only from the matching source: the
  // shared secret answers HS256 and nothing else, and the key set never answers it. That is
  // what stops a token signed with a public key used as a secret.
  const resolveKey: JWTVerifyGetKey = async (header, token) => {
    if (header.alg === 'HS256') {
      if (!secret) {
        throw new TokenError(
          'token is signed with the legacy shared secret and SUPABASE_JWT_SECRET is not set',
          'invalid',
        );
      }
      return secret;
    }
    return jwks(header, token);
  };

  return async (token) => {
    let payload;
    try {
      ({ payload } = await jwtVerify(token, resolveKey, {
        issuer,
        audience: 'authenticated',
        algorithms: ALGORITHMS,
        clockTolerance: 10,
        requiredClaims: ['exp', 'sub'],
      }));
    } catch (cause) {
      throw classify(cause);
    }

    // The anon and service keys are also signed by the project, and anonymous sign-ins mint
    // tokens with the `authenticated` role. An account is what this API asks for.
    if (payload['role'] !== 'authenticated') throw new TokenError('not a user token', 'invalid');
    if (payload['is_anonymous'] === true) throw new TokenError('anonymous user', 'invalid');

    const id = payload.sub;
    if (typeof id !== 'string' || id.length === 0) throw new TokenError('no subject', 'invalid');
    const email = payload['email'];
    return typeof email === 'string' ? { id, email } : { id };
  };
}
