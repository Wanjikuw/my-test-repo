import { hasSessionCookie } from './session-hint';

/**
 * The access token to send to the API, or null when nobody is signed in.
 *
 * The sign-in library is loaded only when there is a session cookie, so a visitor who has never
 * signed in, and every page that does not call the API, never downloads it. `getSession` renews
 * an expired token before returning it, which is why the token is asked for at each call and
 * never kept.
 */
export async function getAccessToken(): Promise<string | null> {
  if (typeof document === 'undefined' || !hasSessionCookie(document.cookie)) return null;
  try {
    const { getBrowserClient } = await import('../supabase/client');
    const { data } = await getBrowserClient().auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}
