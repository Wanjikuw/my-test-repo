import { describe, expect, it } from 'vitest';
import { hasSessionCookie } from './session-hint';

const REF = 'abcdefghijklmnopqrst';

describe('hasSessionCookie', () => {
  it('finds the cookie Supabase keeps the session in', () => {
    expect(hasSessionCookie(`sb-${REF}-auth-token=base64-eyJhIjoxfQ`)).toBe(true);
  });

  it('finds it when the session is split into chunks', () => {
    expect(hasSessionCookie(`sb-${REF}-auth-token.0=aaa; sb-${REF}-auth-token.1=bbb`)).toBe(true);
  });

  it('finds it among other cookies, wherever it falls', () => {
    expect(hasSessionCookie(`theme=dark; sb-${REF}-auth-token=x; lang=en`)).toBe(true);
    expect(hasSessionCookie(`theme=dark; sb-${REF}-auth-token.0=x`)).toBe(true);
  });

  it('finds the cookie of a project on a custom domain or a local one', () => {
    expect(hasSessionCookie('sb-auth-auth-token=x')).toBe(true);
    expect(hasSessionCookie('sb-127-auth-token=x')).toBe(true);
  });

  it('does not take the PKCE verifier, which is a step in signing in, for a session', () => {
    expect(hasSessionCookie(`sb-${REF}-auth-token-code-verifier=abc`)).toBe(false);
  });

  it('does not take another site’s cookie for one', () => {
    expect(hasSessionCookie('')).toBe(false);
    expect(hasSessionCookie('theme=dark; lang=en')).toBe(false);
    expect(hasSessionCookie(`my-sb-${REF}-auth-token=x`)).toBe(false);
    expect(hasSessionCookie(`theme=sb-${REF}-auth-token=x`)).toBe(false);
  });
});
