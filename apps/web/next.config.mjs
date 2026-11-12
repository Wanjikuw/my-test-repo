import { Buffer } from 'node:buffer';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { URL } from 'node:url';
import { parseEnv } from 'node:util';
// withSentryConfig lives on the /config subpath, not the package root, which is the
// runtime SDK entry.
import { withSentryConfig } from '@sentry/nextjs/config';

// Next reads .env files from this folder only, but this repository keeps one at its root, shared
// with the API, and says to put the web variables there. Without this the sign-in settings never
// reach the web app on a developer's machine, and every form says sign-in is not set up. Only
// NEXT_PUBLIC_ names are taken, which are public by definition: the rest of that file is the API's
// secrets, and NODE_ENV or PORT would change how Next itself runs. A variable that is already set,
// by the shell, by the host or by an env file in this folder, wins. A host with no such file
// (Vercel, CI) is unaffected.
try {
  const rootEnv = parseEnv(readFileSync(new URL('../../.env', import.meta.url), 'utf8'));
  for (const [name, value] of Object.entries(rootEnv)) {
    if (name.startsWith('NEXT_PUBLIC_') && value && process.env[name] === undefined) {
      process.env[name] = value;
    }
  }
} catch {
  // No such file, or one that cannot be read: there is nothing to add.
}

// A production bundle that quietly points at localhost is a deploy that works nowhere, and
// the fallback in lib/api.ts would otherwise make exactly that build succeed.
if (process.env.VERCEL_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL must be set for a production build.');
}

// Without these the build succeeds and the site loads, but nobody can sign in, and the tool is
// behind sign-in. Failing the build is kinder than finding out from a visitor.
if (process.env.VERCEL_ENV === 'production') {
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    if (!process.env[name]) {
      throw new Error(`${name} must be set for a production build, or nobody can sign in.`);
    }
  }
}

// Whatever is in a NEXT_PUBLIC_ variable is written into the page for every visitor. A Supabase
// secret or service-role key put here by mistake would be published and would bypass every
// access rule the database has, so a build that finds one stops.
{
  const value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const parts = value ? value.split('.') : [];
  let role = null;
  if (parts.length === 3) {
    try {
      role = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')).role;
    } catch {
      role = null;
    }
  }
  if (value && (value.startsWith('sb_secret_') || role === 'service_role')) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_ANON_KEY holds a secret key, which would be sent to every visitor. ' +
        'Use the anon (or publishable) key instead.',
    );
  }
}

/**
 * Sent with every page. The camera is permitted for this origin only, because label OCR
 * needs it; microphone and location are refused outright, since nothing here uses them.
 */
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // AVIF first: these are photographs, where it saves materially over WebP at equal quality.
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'wanjiku-wakiama',
  project: 'javascript-nextjs',
  // A missing token just skips the upload rather than failing the build — source maps are
  // an enhancement to stack traces, not a build dependency.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
});
