/** Where someone goes after signing in when nothing better is known. */
export const DEFAULT_NEXT = '/';

/** Where a person chooses a new password, once the emailed link has signed them in. */
export const RESET_PATH = '/reset-password';
const FORGOT_PATH = '/forgot-password';

export type RouteAccess = 'public' | 'guest-only' | 'protected';

/**
 * Anyone may read these. Every other path needs a signed-in visitor, so a page added later is
 * closed until it is listed here, which is the safer way round to get it wrong.
 */
const PUBLIC = new Set([
  '/',
  '/about',
  '/privacy',
  // They finish a sign-in themselves, before there is a session to check.
  '/auth/callback',
  '/auth/confirm',
  // Metadata files that browsers and crawlers fetch without credentials.
  '/robots.txt',
  '/icon.svg',
]);

/** For someone who is not signed in. A signed-in visitor is sent on instead. */
const GUEST_ONLY = new Set(['/login', '/signup', FORGOT_PATH]);

export function routeAccess(pathname: string): RouteAccess {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (GUEST_ONLY.has(path)) return 'guest-only';
  return PUBLIC.has(path) ? 'public' : 'protected';
}

const SITE = 'https://site.invalid';
const MAX_NEXT_CHARS = 512;

function hasUnsafeCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f || char === '\\') return true;
  }
  return false;
}

/**
 * The page to go to after signing in, taken from a `next` parameter that anyone can write.
 * Only a path on this site is accepted; anything else is replaced by `fallback`, because a
 * redirect to a lookalike page straight after a sign-in is how credentials get phished.
 */
export function safeNextPath(value: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_NEXT_CHARS) {
    return fallback;
  }
  // One leading slash. Browsers read "//host" and "/\host" as another site, and discard tabs
  // and newlines before they decide, so "/<tab>/host" is "//host" too.
  if (!value.startsWith('/') || value.startsWith('//') || hasUnsafeCharacter(value)) {
    return fallback;
  }

  let parsed: URL;
  try {
    parsed = new URL(value, SITE);
  } catch {
    return fallback;
  }
  const path = parsed.pathname + parsed.search;
  // Resolving "/..//host" or "/.//host" gives "//host", which would leave the site.
  if (parsed.origin !== SITE || path.startsWith('//')) return fallback;
  // Sending someone back to a sign-in page, or into the handlers behind it, would loop.
  if (routeAccess(parsed.pathname) === 'guest-only' || parsed.pathname.startsWith('/auth/')) {
    return fallback;
  }
  return path;
}

/** A query parameter can appear more than once; the first is the one a link means. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function loginPath(options: { next?: string; error?: string } = {}): string {
  const params = new URLSearchParams();
  if (options.error) params.set('error', options.error);
  if (options.next) params.set('next', options.next);
  const query = params.toString();
  return query ? `/login?${query}` : '/login';
}

export function signupPath(next?: string): string {
  return next ? `/signup?${new URLSearchParams({ next }).toString()}` : '/signup';
}

/** `error` is a short code that the page turns into words. It is never shown as it arrives. */
export function forgotPath(error?: string): string {
  return error ? `${FORGOT_PATH}?${new URLSearchParams({ error }).toString()}` : FORGOT_PATH;
}

/** Where Supabase sends the browser back to once Google, or an emailed link, has vouched for it. */
export function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?${new URLSearchParams({ next }).toString()}`;
}

export type AccessDecision = { action: 'continue' } | { action: 'redirect'; to: string };

/** What to do with a request, given what the visitor is signed in as. Kept apart from Next so it can be tested. */
export function accessDecision(input: {
  pathname: string;
  search: string;
  signedIn: boolean;
  next: string | null;
}): AccessDecision {
  const access = routeAccess(input.pathname);

  if (access === 'protected' && !input.signedIn) {
    return {
      action: 'redirect',
      to: loginPath({ next: safeNextPath(input.pathname + input.search) }),
    };
  }
  if (access === 'guest-only' && input.signedIn) {
    return { action: 'redirect', to: safeNextPath(input.next) };
  }
  return { action: 'continue' };
}
