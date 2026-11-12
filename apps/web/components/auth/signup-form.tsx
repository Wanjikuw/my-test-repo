'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authErrorMessage, NOT_CONFIGURED } from '../../lib/auth/messages';
import { callbackUrl, forgotPath, loginPath } from '../../lib/auth/paths';
import {
  hasErrors,
  normaliseEmail,
  PASSWORD_MIN_CHARS,
  SIGNUP_ORDER,
  validateSignup,
  type FieldErrors,
  type SignupValues,
} from '../../lib/auth/validation';
import { getBrowserClient } from '../../lib/supabase/client';
import { Field, focusField } from './field';
import { FormError, GoogleButton, NotConfigured, Or } from './parts';
import { ResendEmail } from './resend-email';

const EMPTY: SignupValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

interface SignupFormProps {
  /** Where to go once signed in. Already checked on the server, so it is a path on this site. */
  next: string;
  configured: boolean;
}

export function SignupForm({ next, configured }: SignupFormProps) {
  const [values, setValues] = useState<SignupValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<SignupValues>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, setPending] = useState<'password' | 'google' | null>(null);
  // Set once the account exists but its address has still to be confirmed.
  const [sentTo, setSentTo] = useState<string | null>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  // Not told to wait for the settings: a form that cannot be typed into looks broken and says
  // nothing about why. It takes what is typed, and says so when it is submitted.
  const busy = pending !== null;

  useEffect(() => {
    if (sentTo) confirmation.current?.focus();
  }, [sentTo]);

  const set = (key: keyof SignupValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!configured) {
      setFailure(NOT_CONFIGURED);
      return;
    }
    const found = validateSignup(values);
    setErrors(found);
    if (hasErrors(found)) {
      const first = SIGNUP_ORDER.find((key) => found[key]);
      if (first) focusField(event.currentTarget, first);
      return;
    }

    const firstName = values.firstName.trim();
    const lastName = values.lastName.trim();
    const email = normaliseEmail(values.email);

    setFailure(null);
    setPending('password');
    try {
      const { data, error } = await getBrowserClient().auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
          emailRedirectTo: callbackUrl(window.location.origin, next),
        },
      });
      if (error) throw error;

      // A session means the project does not ask for the address to be confirmed first.
      if (data.session) {
        window.location.assign(next);
        return;
      }
      setSentTo(email);
      setPending(null);
    } catch (cause) {
      setFailure(authErrorMessage(cause, 'sign-up'));
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
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (cause) {
      setFailure(authErrorMessage(cause, 'google'));
      setPending(null);
    }
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
          If <span className="break-all text-ink">{sentTo}</span> can be used to create an account,
          we have sent a link to it. Open the link to finish. It works once, and expires after a
          while.
        </p>
        <p className="mt-3 leading-relaxed text-muted">
          Nothing after a few minutes? Look in the spam folder, or ask for the email again. If the
          address is wrong,{' '}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="text-ink underline underline-offset-4"
          >
            go back and correct it
          </button>
          .
        </p>
        <div className="mt-5">
          <ResendEmail email={sentTo} next={next} />
        </div>
        <p className="mt-8 text-sm leading-relaxed text-muted">
          Already have an account with this address?{' '}
          <Link href={loginPath({ next })} className="text-ink underline underline-offset-4">
            Sign in
          </Link>{' '}
          or{' '}
          <Link href={forgotPath()} className="text-ink underline underline-offset-4">
            reset your password
          </Link>
          .
        </p>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Create an account</h1>
      <p className="mt-3 leading-relaxed text-muted">
        An account lets you check ingredient labels against your skin profile.
      </p>

      <div className="mt-8 space-y-5">
        {!configured && <NotConfigured />}
        {failure && <FormError>{failure}</FormError>}

        <form noValidate onSubmit={submit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              autoComplete="given-name"
              value={values.firstName}
              onChange={set('firstName')}
              error={errors.firstName}
            />
            <Field
              label="Last name"
              name="lastName"
              autoComplete="family-name"
              value={values.lastName}
              onChange={set('lastName')}
              error={errors.lastName}
            />
          </div>
          <Field
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={set('email')}
            error={errors.email}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint={`At least ${PASSWORD_MIN_CHARS} characters.`}
            value={values.password}
            onChange={set('password')}
            error={errors.password}
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={set('confirmPassword')}
            error={errors.confirmPassword}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-ink px-6 py-3 text-sm text-shell disabled:opacity-40"
          >
            {pending === 'password' ? 'Creating account…' : 'Create account'}
          </button>
          <p className="text-xs leading-relaxed text-muted">
            What is stored about an account, and why, is set out in the{' '}
            <Link href="/privacy" className="underline underline-offset-4">
              privacy notice
            </Link>
            .
          </p>
        </form>

        <Or />
        <GoogleButton label="Sign up with Google" onClick={withGoogle} disabled={busy} />
      </div>

      <p className="mt-8 text-sm text-muted">
        Already have an account?{' '}
        <Link href={loginPath({ next })} className="text-ink underline underline-offset-4">
          Sign in
        </Link>
        .
      </p>
    </>
  );
}
