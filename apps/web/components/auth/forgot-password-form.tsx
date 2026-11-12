'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authErrorMessage, NOT_CONFIGURED } from '../../lib/auth/messages';
import { callbackUrl, RESET_PATH } from '../../lib/auth/paths';
import {
  hasErrors,
  normaliseEmail,
  validateForgot,
  type FieldErrors,
  type ForgotValues,
} from '../../lib/auth/validation';
import { getBrowserClient } from '../../lib/supabase/client';
import { Field, focusField } from './field';
import { FormError, NotConfigured, Notice } from './parts';
import { useCooldown } from './use-cooldown';

interface ForgotPasswordFormProps {
  /** Why the person was sent here, when they were: a reset link that had run out. */
  notice: string | null;
  configured: boolean;
}

export function ForgotPasswordForm({ notice, configured }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ForgotValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Set once the link has been asked for. It says nothing about whether the address has an account.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const cooldown = useCooldown();
  // Not told to wait for the settings: a form that cannot be typed into looks broken and says
  // nothing about why. It takes what is typed, and says so when it is submitted.
  const busy = pending;
  const waiting = cooldown.remaining > 0;

  useEffect(() => {
    if (sentTo) confirmation.current?.focus();
  }, [sentTo]);

  async function send(address: string) {
    setFailure(null);
    setPending(true);
    try {
      const { error } = await getBrowserClient().auth.resetPasswordForEmail(address, {
        redirectTo: callbackUrl(window.location.origin, RESET_PATH),
      });
      if (error) throw error;
      setSentTo(address);
      cooldown.start();
    } catch (cause) {
      setFailure(authErrorMessage(cause, 'recover'));
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!configured) {
      setFailure(NOT_CONFIGURED);
      return;
    }
    const found = validateForgot({ email });
    setErrors(found);
    if (hasErrors(found)) {
      focusField(event.currentTarget, 'email');
      return;
    }
    void send(normaliseEmail(email));
  }

  if (sentTo) {
    return (
      <>
        <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
        <h1
          ref={confirmation}
          tabIndex={-1}
          className="mt-4 font-serif text-3xl outline-none sm:text-4xl"
        >
          Check your email
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          If an account exists for <span className="break-all text-ink">{sentTo}</span>, we have
          sent a link for choosing a new password. The link works once, and expires after a while.
        </p>
        <p className="mt-3 leading-relaxed text-muted">
          Nothing after a few minutes? Look in the spam folder, or ask for another link.
        </p>

        {failure && (
          <div className="mt-4">
            <FormError>{failure}</FormError>
          </div>
        )}
        <button
          type="button"
          onClick={() => void send(sentTo)}
          disabled={busy || waiting}
          className="mt-5 rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
        >
          {pending
            ? 'Sending…'
            : waiting
              ? `Send again in ${cooldown.remaining} s`
              : 'Send the link again'}
        </button>

        <p className="mt-8 text-sm text-muted">
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-ink underline underline-offset-4"
          >
            Use a different address
          </button>
          {' · '}
          <Link href="/login" className="text-ink underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Reset your password</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Enter the email address of your account. We will send a link for choosing a new password.
      </p>

      <div className="mt-8 space-y-5">
        {!configured && <NotConfigured />}
        {notice && <Notice>{notice}</Notice>}
        {failure && <FormError>{failure}</FormError>}

        <form noValidate onSubmit={submit} className="space-y-5">
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink px-6 py-3 text-sm text-shell disabled:opacity-40"
          >
            {pending ? 'Sending…' : 'Send the link'}
          </button>
        </form>
      </div>

      <p className="mt-8 text-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-ink underline underline-offset-4">
          Sign in
        </Link>
        .
      </p>
    </>
  );
}
