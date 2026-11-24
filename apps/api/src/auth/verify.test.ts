import {
  createLocalJWKSet,
  errors,
  exportJWK,
  exportSPKI,
  generateKeyPair,
  SignJWT,
  type JWTVerifyGetKey,
  type KeyLike,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseVerifier, issuerFor, TokenError } from './verify';

const PROJECT = 'https://abcdefgh.supabase.co';
const ISSUER = issuerFor(PROJECT);
const KID = 'key-1';
const LEGACY_SECRET = 'legacy-secret-used-by-older-projects';

type Claims = Record<string, unknown>;

interface Signed {
  alg?: string;
  key?: KeyLike | Uint8Array;
  kid?: string;
  iss?: string;
  aud?: string;
  sub?: string | null;
  exp?: number | string;
  claims?: Claims;
}

let signing: KeyLike;
let foreign: KeyLike;
let rsa: KeyLike;
let publicPem: string;
let keySet: JWTVerifyGetKey;

beforeAll(async () => {
  const ec = await generateKeyPair('ES256');
  const other = await generateKeyPair('ES256');
  const rs = await generateKeyPair('RS256');
  signing = ec.privateKey;
  foreign = other.privateKey;
  rsa = rs.privateKey;
  publicPem = await exportSPKI(ec.publicKey);
  keySet = createLocalJWKSet({
    keys: [
      { ...(await exportJWK(ec.publicKey)), kid: KID, alg: 'ES256', use: 'sig' },
      { ...(await exportJWK(rs.publicKey)), kid: 'rsa-1', alg: 'RS256', use: 'sig' },
    ],
  });
});

async function sign(options: Signed = {}): Promise<string> {
  const alg = options.alg ?? 'ES256';
  const jwt = new SignJWT({ role: 'authenticated', email: 'ada@example.com', ...options.claims })
    .setProtectedHeader({ alg, kid: options.kid ?? KID, typ: 'JWT' })
    .setIssuer(options.iss ?? ISSUER)
    .setAudience(options.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(options.exp ?? '1h');
  if (options.sub !== null) jwt.setSubject(options.sub ?? 'user-1');
  return jwt.sign(options.key ?? signing);
}

const verifier = () => createSupabaseVerifier({ url: PROJECT }, keySet);
const legacy = () => createSupabaseVerifier({ url: PROJECT, jwtSecret: LEGACY_SECRET }, keySet);
const secretKey = (secret: string) => new TextEncoder().encode(secret);

describe('an access token from Supabase Auth', () => {
  it('is accepted, and yields the account it belongs to', async () => {
    await expect(verifier()(await sign())).resolves.toEqual({
      id: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('is accepted without an email, which a phone-only account lacks', async () => {
    const token = await sign({ claims: { email: undefined } });
    await expect(verifier()(token)).resolves.toEqual({ id: 'user-1' });
  });

  it('is accepted when signed with RS256, the other algorithm signing keys offer', async () => {
    const token = await sign({ alg: 'RS256', key: rsa, kid: 'rsa-1' });
    await expect(verifier()(token)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('takes the project URL with or without a trailing slash', async () => {
    const token = await sign();
    const trailing = createSupabaseVerifier({ url: `${PROJECT}/` }, keySet);
    await expect(trailing(token)).resolves.toMatchObject({ id: 'user-1' });
  });
});

describe('a token that must be refused', () => {
  const refused = (token: string, check = verifier()) =>
    expect(check(token)).rejects.toMatchObject({ kind: 'invalid' });

  it('is one that has expired', async () => {
    await refused(await sign({ exp: Math.floor(Date.now() / 1000) - 3_600 }));
  });

  it('is one with no expiry, since it would never lapse', async () => {
    const unbounded = new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject('user-1');
    await refused(await unbounded.sign(signing));
  });

  it('is one issued for another project', async () => {
    await refused(await sign({ iss: 'https://someone-else.supabase.co/auth/v1' }));
  });

  it('is one whose audience is not signed-in users', async () => {
    await refused(await sign({ aud: 'anon' }));
  });

  it('is one with a role other than authenticated, such as the public anon key', async () => {
    await refused(await sign({ claims: { role: 'anon' } }));
    await refused(await sign({ claims: { role: 'service_role' } }));
    await refused(await sign({ claims: { role: undefined } }));
  });

  it('is one from an anonymous sign-in, which is not an account', async () => {
    await refused(await sign({ claims: { is_anonymous: true } }));
  });

  it('is one with no subject to name the account', async () => {
    await refused(await sign({ sub: null }));
  });

  it('is one signed by a key that is not in the project key set', async () => {
    await refused(await sign({ key: foreign }));
  });

  it('is one that names a key the project does not have', async () => {
    await refused(await sign({ kid: 'rotated-away' }));
  });

  it('is one whose payload was changed after signing', async () => {
    const [header, , signature] = (await sign()).split('.');
    const forged = Buffer.from(
      JSON.stringify({
        iss: ISSUER,
        aud: 'authenticated',
        sub: 'someone-else',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3_600,
      }),
    ).toString('base64url');
    await refused(`${header}.${forged}.${signature}`);
  });

  it('is one that claims no algorithm at all', async () => {
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${part({ alg: 'none', typ: 'JWT' })}.${part({
      iss: ISSUER,
      aud: 'authenticated',
      sub: 'user-1',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3_600,
    })}.`;
    await refused(unsigned);
  });

  it('is one signed with the public key used as a shared secret', async () => {
    const confused = await sign({ alg: 'HS256', key: secretKey(publicPem) });
    await refused(confused);
    await refused(confused, legacy());
  });

  it.each([
    ['an empty string', ''],
    ['a single letter', 'x'],
    ['three words joined by dots', 'not.a.token'],
    ['three segments of nonsense', 'a.b.c'],
    ['nothing but separators', '....'],
    ['twenty thousand characters', 'x'.repeat(20_000)],
  ])('is %s, which is not a token at all', async (_description, garbage) => {
    await refused(garbage);
  });
});

describe('the legacy shared secret', () => {
  it('is not trusted unless it has been configured', async () => {
    const token = await sign({ alg: 'HS256', key: secretKey(LEGACY_SECRET) });
    await expect(verifier()(token)).rejects.toMatchObject({
      kind: 'invalid',
      message: expect.stringContaining('SUPABASE_JWT_SECRET'),
    });
  });

  it('accepts a token signed with it once it has', async () => {
    const token = await sign({ alg: 'HS256', key: secretKey(LEGACY_SECRET) });
    await expect(legacy()(token)).resolves.toMatchObject({ id: 'user-1' });
  });

  it('refuses a token signed with some other secret', async () => {
    const token = await sign({ alg: 'HS256', key: secretKey('guessed') });
    await expect(legacy()(token)).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('does not stop asymmetric tokens being accepted', async () => {
    await expect(legacy()(await sign())).resolves.toMatchObject({ id: 'user-1' });
  });
});

describe('when the keys cannot be fetched', () => {
  it('says so, rather than blaming the caller, if the key set is unreachable', async () => {
    const unreachable: JWTVerifyGetKey = async () => {
      throw new Error('connect ECONNREFUSED');
    };
    const check = createSupabaseVerifier({ url: PROJECT }, unreachable);
    await expect(check(await sign())).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('says so if the key set is slow to answer', async () => {
    const slow: JWTVerifyGetKey = async () => {
      throw new errors.JWKSTimeout();
    };
    const check = createSupabaseVerifier({ url: PROJECT }, slow);
    await expect(check(await sign())).rejects.toBeInstanceOf(TokenError);
    await expect(check(await sign())).rejects.toMatchObject({ kind: 'unavailable' });
  });
});
