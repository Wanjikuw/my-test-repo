/**
 * Supabase keeps its session in a cookie called `sb-<project>-auth-token`, split into numbered
 * chunks when it is large. The one that holds a PKCE verifier, `...-auth-token-code-verifier`,
 * is deliberately not matched: it is a step in signing in, not a session.
 */
const SESSION_COOKIE = /(?:^|;\s*)sb-[a-z0-9-]+-auth-token(?:\.\d+)?=/;

/**
 * Whether this browser holds a session cookie. It is a hint, never proof: it lets a visitor
 * who has never signed in skip downloading the sign-in library, and nothing is decided by it.
 * The server checks the real thing.
 */
export function hasSessionCookie(cookieHeader: string): boolean {
  return SESSION_COOKIE.test(cookieHeader);
}
