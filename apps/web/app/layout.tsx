import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import Link from 'next/link';
import { WarmApi } from '../components/warm-api';
import './globals.css';

/**
 * Self-hosted rather than `next/font/google`, which fetches at build time and made the
 * build fail on an intermittent `ETIMEDOUT` from fonts.gstatic.com. A build that can be
 * broken by someone else's CDN is not a build.
 */
const inter = localFont({
  src: './fonts/inter.woff2',
  variable: '--font-inter',
  weight: '400 600',
  display: 'swap',
});

const fraunces = localFont({
  src: './fonts/fraunces.woff2',
  variable: '--font-fraunces',
  weight: '400 700',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Angalia - check what is in your skincare',
  description:
    'Reads a cosmetic ingredient label against EU Regulation (EC) No 1223/2009 and your skin profile, and says plainly what it could not check.',
  // The production domain is public while the site is unfinished, and nothing should index it yet.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        <WarmApi />
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-baseline gap-6 px-5 py-4">
            <Link href="/" className="font-serif text-xl">
              Angalia
            </Link>
            <Link href="/check" className="text-sm text-muted hover:text-ink">
              Check a label
            </Link>
          </nav>
        </header>

        {children}

        <footer className="mt-20 border-t border-line">
          <div className="mx-auto max-w-5xl px-5 py-8 text-sm text-muted">
            <p>
              Angalia reports what EU Regulation (EC) No 1223/2009 says about the ingredients it can
              identify. It is not medical advice, and it cannot tell you a product is safe.
            </p>
            <nav aria-label="Footer" className="mt-4 flex gap-6">
              <Link href="/about" className="hover:text-ink">
                About and sources
              </Link>
              <Link href="/privacy" className="hover:text-ink">
                Privacy
              </Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
