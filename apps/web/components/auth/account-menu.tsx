'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { displayName } from '../../lib/auth/display';
import { hasSessionCookie } from '../../lib/auth/session-hint';

type State = { status: 'unknown' } | { status: 'out' } | { status: 'in'; name: string };

/**
 * Who is signed in, in the header of every page.
 *
 * The sign-in library is not loaded for a visitor with no session cookie, which is nearly everyone
 * on the landing page, so the page they came to read costs them nothing extra. Until the browser
 * has looked, and on the server, nothing is drawn, so the first paint matches the server's.
 */
export function AccountMenu() {
  const [state, setState] = useState<State>({ status: 'unknown' });

  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) {
      setState({ status: 'out' });
      return;
    }

    let cancelled = false;
    let stop = () => {};
    import('../../lib/supabase/client')
      .then(({ getBrowserClient }) => {
        // Called straight away with the current session, then on every sign-in and sign-out,
        // including those in another tab.
        const { data } = getBrowserClient().auth.onAuthStateChange((_event, session) => {
          if (cancelled) return;
          setState(session ? { status: 'in', name: displayName(session.user) } : { status: 'out' });
        });
        stop = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'out' });
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  async function signOut() {
    try {
      const { getBrowserClient } = await import('../../lib/supabase/client');
      // This browser only. The default would end the account's sessions on every device.
      await getBrowserClient().auth.signOut({ scope: 'local' });
    } finally {
      window.location.assign('/');
    }
  }

  if (state.status === 'unknown') return <div className="ml-auto" aria-hidden />;

  return (
    <div className="ml-auto flex items-baseline gap-4 text-sm whitespace-nowrap sm:gap-5">
      {state.status === 'in' ? (
        <>
          <span className="hidden text-muted sm:inline">{state.name}</span>
          <button type="button" onClick={signOut} className="text-muted hover:text-ink">
            Sign out
          </button>
        </>
      ) : (
        <>
          <Link href="/login" className="text-muted hover:text-ink">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-md border border-line px-3 py-1.5 hover:border-muted sm:inline-block"
          >
            Create account
          </Link>
        </>
      )}
    </div>
  );
}
