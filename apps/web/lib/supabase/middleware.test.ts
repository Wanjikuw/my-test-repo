import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSession } from './middleware';

const URL_ = 'https://abcdefgh.supabase.co';
const COOKIE = 'sb-abcdefgh-auth-token';
const KID = 'test-key';

const b64url = (input: string | Uint8Array) => Buffer.from(input as string).toString('base64url');

async function signedToken(overrides: Record<string, unknown> = {}) {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: KID, alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: KID }));
  const body = b64url(
    JSON.stringify({
      iss: `${URL_}/auth/v1`,
      sub: '11111111-1111-1111-1111-111111111111',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'a@example.com',
      is_anonymous: false,
      session_id: '22222222-2222-2222-2222-222222222222',
      iat: now,
      exp: now + 3600,
      ...overrides,
    }),
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    Buffer.from(`${head}.${body}`),
  );
  return { token: `${head}.${body}.${b64url(new Uint8Array(signature))}`, jwk };
}

function sessionCookie(accessToken: string, expiresIn = 3600) {
  const session = {
    access_token: accessToken,
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'a@example.com',
    },
  };
  return `base64-${b64url(JSON.stringify(session))}`;
}

function request(cookieValue?: string, protocol = 'http') {
  return new NextRequest(
    `${protocol}://localhost:3000/check`,
    cookieValue ? { headers: { cookie: `${COOKIE}=${cookieValue}` } } : {},
  );
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('updateSession, with the cookie the browser really writes', () => {
  it('recognises a signed-in visitor whose token was signed with the project key', async () => {
    const { token, jwk } = await signedToken();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ keys: [jwk] })),
    );

    const state = await updateSession(request(sessionCookie(token)));

    expect(state.signedIn).toBe(true);
  });

  it('recognises one when the project still signs with the legacy shared secret', async () => {
    const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const body = b64url(
      JSON.stringify({
        sub: '11111111-1111-1111-1111-111111111111',
        aud: 'authenticated',
        role: 'authenticated',
        is_anonymous: false,
        iat: now,
        exp: now + 3600,
      }),
    );
    const token = `${head}.${body}.${b64url('signature-is-checked-by-the-service')}`;
    const fetchMock = vi.fn(async (target: unknown) =>
      String(target).includes('/auth/v1/user')
        ? Response.json({ id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated' })
        : new Response('not found', { status: 404 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const state = await updateSession(request(sessionCookie(token)));

    expect(state.signedIn).toBe(true);
  });

  it('asks the service when the signing keys cannot be fetched, rather than bouncing them', async () => {
    const { token } = await signedToken();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (target: unknown) =>
        String(target).includes('/auth/v1/user')
          ? Response.json({ id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated' })
          : new Response('unavailable', { status: 503 }),
      ),
    );

    expect((await updateSession(request(sessionCookie(token)))).signedIn).toBe(true);
  });

  it('counts a token the service refuses as signed out, even if the keys are unreachable', async () => {
    const { token } = await signedToken();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"msg":"invalid JWT"}', { status: 401 })),
    );

    expect((await updateSession(request(sessionCookie(token)))).signedIn).toBe(false);
  });

  it('counts a visitor with no cookie as signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ keys: [] })),
    );

    expect((await updateSession(request())).signedIn).toBe(false);
  });

  it('counts a token signed with some other key as signed out', async () => {
    const { token } = await signedToken();
    const other = await signedToken();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ keys: [other.jwk] })),
    );

    expect((await updateSession(request(sessionCookie(token)))).signedIn).toBe(false);
  });
});
