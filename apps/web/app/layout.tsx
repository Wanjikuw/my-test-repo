import type { ReactNode } from 'react';
import { Fraunces, Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });

export const metadata = {
  title: 'Angalia — check what is in your skincare',
  description:
    'Reads a cosmetic ingredient label against EU Regulation (EC) No 1223/2009 and your skin profile, and says plainly what it could not check.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
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
          </div>
        </footer>
      </body>
    </html>
  );
}
