'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Catches an error thrown while a page renders, so the header and footer survive it.
// global-error.tsx catches the ones the root layout itself throws.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Error</p>
      <h1 className="mt-4 font-serif text-4xl">This page could not be shown.</h1>
      <p className="mt-4 max-w-xl leading-relaxed text-muted">
        Something failed on our side. Your skin profile is kept on this device and has not been
        lost. Try again, and if it keeps happening, come back a little later.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 rounded-md bg-ink px-6 py-3 text-sm text-shell"
      >
        Try again
      </button>
    </main>
  );
}
