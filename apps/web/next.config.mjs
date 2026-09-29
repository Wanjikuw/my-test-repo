import process from 'node:process';
// withSentryConfig lives on the /config subpath, not the package root, which is the
// runtime SDK entry.
import { withSentryConfig } from '@sentry/nextjs/config';

// A production bundle that quietly points at localhost is a deploy that works nowhere, and
// the fallback in lib/api.ts would otherwise make exactly that build succeed.
if (process.env.VERCEL_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL must be set for a production build.');
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
