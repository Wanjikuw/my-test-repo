import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { forgotPath, loginPath, RESET_PATH, safeNextPath } from '../../../lib/auth/paths';
import { getServerClient } from '../../../lib/supabase/server';

/** The only kinds of link this site sends. An invitation or an address change is not accepted here. */
const ACCEPTED = new Set<string>(['signup', 'email', 'recovery']);

/**
 * Where the confirmation and reset emails point when their templates are
 * `{{ .SiteURL }}/auth/confirm?token_hash=...`. Unlike the `code` flow it does not depend on a
 * cookie from the browser that asked, so it works when the link is opened on another device, or
 * in a mail app's own browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get('next'));

  const go = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.headers.set('cache-control', 'private, no-store');
    return response;
  };

  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const recovery = type === 'recovery';
  // A reset link that does not work is answered where a new one can be asked for.
  const failed = () => go(recovery ? forgotPath('expired') : loginPath({ error: 'confirm', next }));

  if (!tokenHash || !type || !ACCEPTED.has(type)) return failed();

  const supabase = await getServerClient(request.nextUrl.protocol === 'https:');
  if (!supabase) return go(loginPath({ error: 'config', next }));

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });
  // A reset link always ends at the form for a new password, whatever `next` says.
  return error ? failed() : go(recovery ? RESET_PATH : next);
}
