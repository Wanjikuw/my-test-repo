import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from './config';

/**
 * A sign-in client for a route handler, reading the visitor's cookies and writing new ones back.
 * Null when sign-in is not configured. A new one is made per request, because the cookies are
 * the request's. `secure` says whether the request came over HTTPS, since the library sets no
 * Secure flag of its own.
 */
export async function getServerClient(secure: boolean) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const store = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookieOptions: { secure },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) store.set(name, value, options);
        } catch {
          // Called from somewhere cookies cannot be written. The middleware renews the session.
        }
      },
    },
  });
}
