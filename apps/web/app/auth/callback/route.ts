import { NextResponse, type NextRequest } from 'next/server';
import { forgotPath, loginPath, RESET_PATH, safeNextPath } from '../../../lib/auth/paths';
import { getServerClient } from '../../../lib/supabase/server';

/**
 * Where Supabase sends the browser back to after Google, or after an emailed link, has vouched
 * for it. The `code` in the address is single-use and is only worth anything to the browser that
 * started the sign-in, which holds the other half of it in a cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get('next'));

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set('cache-control', 'private, no-store');
    return response;
  };
  // A reset link that does not work is answered where a new one can be asked for.
  const failed = (code: string) =>
    go(next === RESET_PATH ? forgotPath('expired') : loginPath({ error: code, next }));

  // Google, or the person at its consent screen, said no; or an emailed link had run out.
  if (searchParams.get('error')) {
    return failed(searchParams.get('error') === 'access_denied' ? 'access_denied' : 'callback');
  }

  const code = searchParams.get('code');
  if (!code) return failed('callback');

  const supabase = await getServerClient(request.nextUrl.protocol === 'https:');
  if (!supabase) return go(loginPath({ error: 'config', next }));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return error ? failed('callback') : go(next);
}
