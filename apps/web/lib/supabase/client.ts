import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('Sign-in is not configured for this site.');
    this.name = 'AuthNotConfiguredError';
  }
}

/** The browser's sign-in client. The library hands back one shared instance, so this is cheap to call. */
export function getBrowserClient() {
  const config = getSupabaseConfig();
  if (!config) throw new AuthNotConfiguredError();
  return createBrowserClient(config.url, config.anonKey, {
    // The library sets no Secure flag of its own. Over HTTPS the session must not be sent over HTTP.
    cookieOptions: { secure: window.location.protocol === 'https:' },
  });
}
