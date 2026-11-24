'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { authErrorMessage, needsConfirmation, NOT_CONFIGURED } from '../../lib/auth/messages';
import { callbackUrl, forgotPath, signupPath } from '../../lib/auth/paths';
import {
  hasErrors,
  LOGIN_ORDER,
  normaliseEmail,
  validateLogin,
  type FieldErrors,
  type LoginValues,
} from '../../lib/auth/validation';
import { getBrowserClient } from '../../lib/supabase/client';
import { Field, focusField } from './field';
import { FormError, GoogleButton, NotConfigured, Or } from './parts';
import { ResendEmail } from './resend-email';

interface LoginFormProps {
  /** Where to go once signed in. Already checked on the server, so it is a path on this site. */
  next: string;
  /** Why the person was sent back here, when they were. */
  notice: string | null;
  configured: boolean;
}

export function LoginForm({ next, notice, configured }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<LoginValues>>({});
  const [failure, setFailure] = useState<string | null>(notice);
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  // The address, once the service has said it has not been confirmed. A new email can fix that.
  const [unconfirmed, setUnconfirmed] = useState<string | null>(null);
  // Not told to wait for the settings: a form that cannot be typed into looks broken and says
  // nothing about why. It takes what is typed, and says so when it is submitted.
  const busy = pending !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!configured) {
      setFailure(NOT_CONFIGURED);
      return;
    }
    const found = validateLogin({ email, password });
    setErrors(found);
    if (hasErrors(found)) {
      const first = LOGIN_ORDER.find((key) => found[key]);
      if (first) focusField(event.currentTarget, first);
      return;
    }

    setFailure(null);
    setUnconfirmed(null);
    setPending('password');
    try {
      const { error } = await getBrowserClient().auth.signInWithPassword({
        email: normaliseEmail(email),
        password,
      });
      if (error) throw error;
      // A full navigation, so the middleware reads the cookies that were just written. The
      // button stays disabled until the page has gone.
      window.location.assign(next);
    } catch (cause) {
      setFailure(authErrorMessage(cause, 'sign-in'));
      if (needsConfirmation(cause)) setUnconfirmed(normaliseEmail(email));
      setPending(null);
    }
  }

  async function withGoogle() {
    if (busy) return;
    if (!configured) {
      setFailure(NOT_CONFIGURED);
      return;
    }
    setFailure(null);
    setPending('google');
    try {
      const { error } = await getBrowserClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl(window.location.origin, next),
          // Without this a browser signed in to one Google account goes straight through with it.
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (cause) {
      setFailure(authErrorMessage(cause, 'google'));
      setPending(null);
    }
  }

  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Sign in</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Sign in to check an ingredient label against your skin profile.
      </p>

      <div className="mt-8 space-y-5">
        {!configured && <NotConfigured />}
        {failure && <FormError>{failure}</FormError>}
        {unconfirmed && <ResendEmail email={unconfirmed} next={next} />}

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
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />
          <p className="-mt-2 text-right text-xs">
            <Link
              href={forgotPath()}
              className="text-muted underline underline-offset-4 hover:text-ink"
            >
              Forgot your password?
            </Link>
          </p>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink px-6 py-3 text-sm text-shell disabled:opacity-40"
          >
            {pending === 'password' ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <Or />
        <GoogleButton label="Sign in with Google" onClick={withGoogle} disabled={busy} />
      </div>

      <p className="mt-8 text-sm text-muted">
        No account yet?{' '}
        <Link href={signupPath(next)} className="text-ink underline underline-offset-4">
          Create one
        </Link>
        .
      </p>
    </>
  );
}
