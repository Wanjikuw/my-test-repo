'use client';

import { useState } from 'react';
import { deleteAccount, deletionErrorMessage } from '../lib/account';

/**
 * Permanent deletion, behind a second step so it cannot be done by one stray tap. It lives in
 * the account panel, the one place a person looks to manage what is stored about them.
 */
export function DeleteAccount() {
  const [step, setStep] = useState<'idle' | 'confirm' | 'busy'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setStep('busy');
    setError(null);
    try {
      const { getBrowserClient } = await import('../lib/supabase/client');
      const client = getBrowserClient();
      await deleteAccount({ rpc: (fn) => client.rpc(fn), auth: client.auth }, window.localStorage);
      window.location.assign('/');
    } catch (cause) {
      setError(deletionErrorMessage(cause));
      setStep('confirm');
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      {step === 'idle' && (
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="text-muted underline underline-offset-4 hover:text-ink"
        >
          Delete my account
        </button>
      )}

      {step !== 'idle' && (
        <>
          <p className="text-ink">
            This permanently deletes your account and the profile saved in it. It cannot be undone.
            Anything on this device that was not saved to your account stays here.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={step === 'busy'}
              onClick={confirm}
              className="rounded-md border border-avoid px-4 py-2 text-avoid hover:bg-avoid/10 disabled:opacity-40"
            >
              {step === 'busy' ? 'Deleting…' : 'Yes, delete my account'}
            </button>
            <button
              type="button"
              disabled={step === 'busy'}
              onClick={() => {
                setStep('idle');
                setError(null);
              }}
              className="rounded-md border border-line px-4 py-2 hover:border-muted disabled:opacity-40"
            >
              Keep my account
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" className="mt-2 text-avoid">
          {error}
        </p>
      )}
    </div>
  );
}
