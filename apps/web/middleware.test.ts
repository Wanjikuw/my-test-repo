import { describe, expect, it } from 'vitest';
import { config } from './middleware';

/**
 * Which requests the middleware sees. Next compiles a matcher with path-to-regexp, whose one
 * custom group is an ordinary regular expression and is matched without regard to case, so the
 * pattern can be read the same way here.
 */
const pattern = config.matcher[0];
const runsFor = (path: string) => new RegExp(`^${pattern}$`, 'i').test(path);

describe('the middleware matcher', () => {
  it.each([
    '/',
    '/check',
    '/check/history',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/about',
    '/privacy',
    '/auth/callback',
    '/auth/confirm',
    '/a-page-added-next-month',
  ])('runs for the page %s', (path) => {
    expect(runsFor(path)).toBe(true);
  });

  it.each([
    '/_next/static/chunks/main-abc123.js',
    '/_next/static/media/inter.woff2',
    '/_next/image',
    '/monitoring',
    '/monitoring/',
    '/favicon.ico',
    '/icon.svg',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.webmanifest',
  ])('leaves %s alone, because it is not a page', (path) => {
    expect(runsFor(path)).toBe(false);
  });

  // The landing page's photographs are public, so a visitor who has not signed in must get them
  // and not a redirect to the sign-in page.
  it.each([
    '/hero/marble.jpg',
    '/hero/shore.jpeg',
    '/hero/shore.JPG',
    '/og/card.png',
    '/hero/shore.webp',
    '/hero/shore.avif',
    '/logo.svg',
    '/fonts/inter.woff2',
    '/fonts/inter.woff',
  ])('leaves the public image or font %s alone', (path) => {
    expect(runsFor(path)).toBe(false);
  });

  // An exclusion that stops at a word, not at a boundary, would leave a page named like it open.
  it.each([
    '/monitoring-report',
    '/monitoring2',
    '/robots.txt.html',
    '/robots.txtx',
    '/icon.svg/extra',
    '/_next/staticky',
    '/pngs',
    '/photo.png/edit',
    '/jpg',
  ])('still protects %s, which only resembles one of them', (path) => {
    expect(runsFor(path)).toBe(true);
  });
});
