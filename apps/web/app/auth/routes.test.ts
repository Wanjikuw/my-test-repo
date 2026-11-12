import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  configured: { value: true },
}));

// The sign-in service itself is not under test. What these tests pin down is where each outcome
// of it sends the browser, which is the part that decides whether anyone is signed in and where.
vi.mock('../../lib/supabase/server', () => ({
  getServerClient: vi.fn(async () =>
    mocks.configured.value
      ? {
          auth: {
            verifyOtp: mocks.verifyOtp,
            exchangeCodeForSession: mocks.exchangeCodeForSession,
          },
        }
      : null,
  ),
}));

import { getServerClient } from '../../lib/supabase/server';
import { GET as callback } from './callback/route';
import { GET as confirm } from './confirm/route';

const ORIGIN = 'https://angalia.example';
const signedIn = { error: null };
const refused = { error: { code: 'otp_expired' } };

/** Where the response sends the browser, as a path on this site, or the whole address if it left. */
async function destination(
  handler: typeof callback | typeof confirm,
  query: string,
  base = ORIGIN,
): Promise<{ to: string | undefined; cache: string | null; status: number }> {
  const res = await handler(new NextRequest(`${base}/auth/x?${query}`));
  const raw = res.headers.get('location');
  const url = raw ? new URL(raw, base) : null;
  return {
    to: url ? (url.origin === base ? url.pathname + url.search : url.href) : undefined,
    cache: res.headers.get('cache-control'),
    status: res.status,
  };
}

beforeEach(() => {
  mocks.verifyOtp.mockReset().mockResolvedValue(signedIn);
  mocks.exchangeCodeForSession.mockReset().mockResolvedValue(signedIn);
  mocks.configured.value = true;
  vi.mocked(getServerClient).mockClear();
});

describe('/auth/confirm', () => {
  it.each(['signup', 'email'])(
    'signs in with a %s link and goes where the visitor was going',
    async (type) => {
      const outcome = await destination(confirm, `token_hash=abc&type=${type}&next=/about`);

      expect(mocks.verifyOtp).toHaveBeenCalledWith({ type, token_hash: 'abc' });
      expect(outcome.to).toBe('/about');
    },
  );

  it('goes to the homepage when the link names no destination', async () => {
    expect((await destination(confirm, 'token_hash=abc&type=email')).to).toBe('/');
  });

  it('never follows a destination that leaves the site', async () => {
    for (const next of ['//evil.example', 'https://evil.example', '/\\evil.example', '/login']) {
      const outcome = await destination(
        confirm,
        `token_hash=abc&type=email&next=${encodeURIComponent(next)}`,
      );
      expect(outcome.to).toBe('/');
    }
  });

  it('sends a reset link to the new-password page, whatever destination it names', async () => {
    for (const next of ['', '&next=/check', '&next=/about', '&next=//evil.example']) {
      const outcome = await destination(confirm, `token_hash=abc&type=recovery${next}`);
      expect(outcome.to).toBe('/reset-password');
    }
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc' });
  });

  it('sends a confirmation link that has run out back to sign-in', async () => {
    mocks.verifyOtp.mockResolvedValue(refused);

    const outcome = await destination(confirm, 'token_hash=abc&type=email');
    expect(outcome.to).toBe('/login?error=confirm&next=%2F');
  });

  it('sends a reset link that has run out to where a new one can be asked for', async () => {
    mocks.verifyOtp.mockResolvedValue(refused);

    const outcome = await destination(confirm, 'token_hash=abc&type=recovery');
    expect(outcome.to).toBe('/forgot-password?error=expired');
  });

  // An invitation or an address change is a different promise from the ones this site makes.
  it.each(['invite', 'magiclink', 'email_change', 'sms', 'phone_change', 'RECOVERY', '', 'x'])(
    'refuses a link of type %j without asking the service',
    async (type) => {
      const outcome = await destination(confirm, `token_hash=abc&type=${type}`);

      expect(mocks.verifyOtp).not.toHaveBeenCalled();
      expect(outcome.to).toBe('/login?error=confirm&next=%2F');
    },
  );

  it('refuses a link with no token, and a reset link with no token goes to the request page', async () => {
    expect((await destination(confirm, 'type=email')).to).toBe('/login?error=confirm&next=%2F');
    expect((await destination(confirm, 'token_hash=&type=email')).to).toBe(
      '/login?error=confirm&next=%2F',
    );
    expect((await destination(confirm, 'token_hash=abc')).to).toBe('/login?error=confirm&next=%2F');
    expect((await destination(confirm, 'type=recovery')).to).toBe('/forgot-password?error=expired');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it('says so when sign-in is not set up, and asks the service nothing', async () => {
    mocks.configured.value = false;

    const outcome = await destination(confirm, 'token_hash=abc&type=recovery');
    expect(outcome.to).toBe('/login?error=config&next=%2F');
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it('marks its cookies Secure on https and not on plain http, which a local build uses', async () => {
    await destination(confirm, 'token_hash=abc&type=email');
    await destination(confirm, 'token_hash=abc&type=email', 'http://localhost:3000');

    expect(vi.mocked(getServerClient).mock.calls.map((call) => call[0])).toEqual([true, false]);
  });

  it('is a redirect that no shared cache may keep, since it carries a session', async () => {
    const outcome = await destination(confirm, 'token_hash=abc&type=email');
    expect(outcome.status).toBeGreaterThanOrEqual(300);
    expect(outcome.status).toBeLessThan(400);
    expect(outcome.cache).toBe('private, no-store');
  });
});

describe('/auth/callback', () => {
  it('signs in with the code and goes where the visitor was going', async () => {
    const outcome = await destination(callback, 'code=abc&next=/about');

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc');
    expect(outcome.to).toBe('/about');
  });

  it('goes to the homepage when no destination is named', async () => {
    expect((await destination(callback, 'code=abc')).to).toBe('/');
  });

  it('never follows a destination that leaves the site', async () => {
    for (const next of [
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
      '/auth/callback',
    ]) {
      const outcome = await destination(callback, `code=abc&next=${encodeURIComponent(next)}`);
      expect(outcome.to).toBe('/');
    }
  });

  it('lands on the new-password page when that is where the reset email sent it', async () => {
    const outcome = await destination(callback, 'code=abc&next=/reset-password');
    expect(outcome.to).toBe('/reset-password');
  });

  it('sends a code that does not work back to sign-in', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue(refused);

    const outcome = await destination(callback, 'code=abc');
    expect(outcome.to).toBe('/login?error=callback&next=%2F');
  });

  it('sends a reset code that does not work to where a new link can be asked for', async () => {
    mocks.exchangeCodeForSession.mockResolvedValue(refused);

    expect((await destination(callback, 'code=abc&next=/reset-password')).to).toBe(
      '/forgot-password?error=expired',
    );
  });

  it('tells a cancelled Google sign-in from any other failure, and asks the service nothing', async () => {
    expect((await destination(callback, 'error=access_denied&code=abc')).to).toBe(
      '/login?error=access_denied&next=%2F',
    );
    expect((await destination(callback, 'error=server_error&code=abc')).to).toBe(
      '/login?error=callback&next=%2F',
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('treats an emailed reset link that had run out as the reset page’s to answer', async () => {
    const outcome = await destination(
      callback,
      'error=access_denied&error_code=otp_expired&next=/reset-password',
    );
    expect(outcome.to).toBe('/forgot-password?error=expired');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('refuses a request with no code', async () => {
    expect((await destination(callback, '')).to).toBe('/login?error=callback&next=%2F');
    expect((await destination(callback, 'next=/about')).to).toBe(
      '/login?error=callback&next=%2Fabout',
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('says so when sign-in is not set up, and asks the service nothing', async () => {
    mocks.configured.value = false;

    expect((await destination(callback, 'code=abc')).to).toBe('/login?error=config&next=%2F');
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('marks its cookies Secure on https and not on plain http', async () => {
    await destination(callback, 'code=abc');
    await destination(callback, 'code=abc', 'http://localhost:3000');

    expect(vi.mocked(getServerClient).mock.calls.map((call) => call[0])).toEqual([true, false]);
  });

  it('is a redirect that no shared cache may keep, since it carries a session', async () => {
    const outcome = await destination(callback, 'code=abc');
    expect(outcome.cache).toBe('private, no-store');
  });
});
