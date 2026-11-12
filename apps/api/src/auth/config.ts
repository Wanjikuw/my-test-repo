import { createSupabaseVerifier, type TokenVerifier } from './verify';

/**
 * Sign-in is enforced in production unless `AUTH_REQUIRED=false` says otherwise, and anywhere
 * else only when `AUTH_REQUIRED=true` does. Required but unconfigured is an error at boot, for
 * the same reason as CORS_ORIGIN: an API that starts open because a variable is missing is
 * worse than one that does not start.
 */
export function resolveAuth(env: NodeJS.ProcessEnv = process.env): TokenVerifier | null {
  const flag = env.AUTH_REQUIRED?.trim().toLowerCase();
  const required = flag === 'true' || (flag !== 'false' && env.NODE_ENV === 'production');
  if (!required) return null;

  const raw = env.SUPABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      'SUPABASE_URL must be set while sign-in is required. Set AUTH_REQUIRED=false to run without it.',
    );
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('SUPABASE_URL is not a valid URL.');
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('SUPABASE_URL must start with https://.');
  }

  return createSupabaseVerifier({
    url: url.origin,
    jwtSecret: env.SUPABASE_JWT_SECRET?.trim() || undefined,
  });
}
