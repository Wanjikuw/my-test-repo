import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './config';

export interface SessionState {
  /** The response to return, or to copy cookies from when returning a different one. */
  response: NextResponse;
  signedIn: boolean;
}

/**
 * Works out who is signed in from the request's cookies, renewing the session if it has expired.
 *
 * Nothing may run between creating the client and asking it for the claims. `getClaims` checks
 * the token's signature, which `getSession` does not: a cookie can be written by anyone, so
 * only a verified token is evidence of anything. Anything that goes wrong counts as signed out.
 */
export async function updateSession(request: NextRequest): Promise<SessionState> {
  let response = NextResponse.next({ request });
  const config = getSupabaseConfig();
  if (!config) return { response, signedIn: false };

  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: { secure: request.nextUrl.protocol === 'https:' },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet, headers) => {
        // Both sides need the renewed token: the request, so the page being rendered does not
        // renew it a second time (a refresh token is good for one use), and the response, so
        // the browser replaces its copy. The headers keep a CDN from storing either.
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (
      !error &&
      claims?.role === 'authenticated' &&
      claims.is_anonymous !== true &&
      typeof claims.sub === 'string'
    ) {
      return { response, signedIn: true };
    }
  } catch {
    // Fall through to the service, which is the authority on the token.
  }

  // Local verification can fail for reasons that say nothing about the visitor (the signing
  // keys could not be fetched, say). Asking the service is slower but just as trustworthy, and
  // it avoids sending someone who is signed in back to the sign-in page.
  if (!request.cookies.getAll().some(({ name }) => name.startsWith('sb-'))) {
    return { response, signedIn: false };
  }
  try {
    const { data, error } = await supabase.auth.getUser();
    const user = data?.user;
    return {
      response,
      signedIn: !error && typeof user?.id === 'string' && user.is_anonymous !== true,
    };
  } catch {
    return { response, signedIn: false };
  }
}
