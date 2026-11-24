'use client';

import { useState } from 'react';
import { authErrorMessage } from '../../lib/auth/messages';
import { callbackUrl } from '../../lib/auth/paths';
import { getBrowserClient } from '../../lib/supabase/client';
import { useCooldown } from './use-cooldown';

type Outcome = { status: 'idle' } | { status: 'asked' } | { status: 'failed'; message: string };

/**
 * Asks for the confirmation email again. The service allows one a minute for an address, so the
 * button is disabled for that long after each request and says why, instead of letting a second
 * press come back as an error. What it reports is that the email was asked for, not that one
 * will arrive: whether the address has an account is not for this page to reveal.
 */
export function ResendEmail({ email, next }: { email: string; next: string }) {
  const [outcome, setOutcome] = useState<Outcome>({ status: 'idle' });
  const [pending, setPending] = useState(false);
  const cooldown = useCooldown();
  const waiting = cooldown.remaining > 0;

  async function resend() {
    if (pending || waiting) return;
    setPending(true);
    setOutcome({ status: 'idle' });
    try {
      const { error } = await getBrowserClient().auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: callbackUrl(window.location.origin, next) },
      });
      if (error) throw error;
      setOutcome({ status: 'asked' });
      cooldown.start();
    } catch (cause) {
      setOutcome({ status: 'failed', message: authErrorMessage(cause, 'resend') });
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={resend}
        disabled={pending || waiting}
        className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
      >
        {pending
          ? 'Sending…'
          : waiting
            ? `Send again in ${cooldown.remaining} s`
            : 'Send the email again'}
      </button>
      {outcome.status === 'asked' && (
        <p role="status" className="mt-2 text-xs text-muted">
          Asked for the email again. It can take a few minutes to arrive.
        </p>
      )}
      {outcome.status === 'failed' && (
        <p role="alert" className="mt-2 text-xs text-avoid">
          {outcome.message}
        </p>
      )}
    </div>
  );
}
