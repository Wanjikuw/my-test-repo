'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { authErrorMessage, NOT_CONFIGURED, sessionMissing } from '../../lib/auth/messages';
import { DEFAULT_NEXT, forgotPath } from '../../lib/auth/paths';
import {
  hasErrors,
  PASSWORD_MIN_CHARS,
  RESET_ORDER,
  validateReset,
  type FieldErrors,
  type ResetValues,
} from '../../lib/auth/validation';
import { getBrowserClient } from '../../lib/supabase/client';
import { Field, focusField } from './field';
import { FormError, NotConfigured } from './parts';

const EMPTY: ResetValues = { password: '', confirmPassword: '' };

export function ResetPasswordForm({ configured }: { configured: boolean }) {
  const [values, setValues] = useState<ResetValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<ResetValues>>({});
  // `ended` means the session this page relies on has gone, which a new reset link fixes.
  const [failure, setFailure] = useState<{ message: string; ended: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  // Not told to wait for the settings: a form that cannot be typed into looks broken and says
  // nothing about why. It takes what is typed, and says so when it is submitted.
  const busy = pending;

  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  const set = (key: keyof ResetValues) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!configured) {
      setFailure({ message: NOT_CONFIGURED, ended: false });
      return;
    }
    const found = validateReset(values);
    setErrors(found);
    if (hasErrors(found)) {
      const first = RESET_ORDER.find((key) => found[key]);
      if (first) focusField(event.currentTarget, first);
      return;
    }

    setFailure(null);
    setPending(true);
    try {
      const supabase = getBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      // The password may be forgotten because someone else knew it, so a change ends every other
      // session. This is a precaution: the change has been made whether or not it succeeds.
      await supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
      setDone(true);
    } catch (cause) {
      setFailure({
        message: authErrorMessage(cause, 'update-password'),
        ended: sessionMissing(cause),
      });
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <>
        <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
        <h1
          ref={heading}
          tabIndex={-1}
          className="mt-4 font-serif text-3xl outline-none sm:text-4xl"
        >
          Password changed
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Your password has been changed. Use it the next time you sign in.
        </p>
        <Link
          href={DEFAULT_NEXT}
          className="mt-8 inline-block rounded-md bg-ink px-6 py-3 text-sm text-shell"
        >
          Check a label
        </Link>
      </>
    );
  }

  return (
    <>
      <p className="text-xs font-medium tracking-[0.2em] text-muted uppercase">Account</p>
      <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Choose a new password</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Pick a password you have not used before. It replaces the current one.
      </p>

      <div className="mt-8 space-y-5">
        {!configured && <NotConfigured />}
        {failure && (
          <div className="space-y-2">
            <FormError>{failure.message}</FormError>
            {failure.ended && (
              <p className="text-sm">
                <Link href={forgotPath()} className="text-ink underline underline-offset-4">
                  Request a new link
                </Link>
              </p>
            )}
          </div>
        )}

        <form noValidate onSubmit={submit} className="space-y-5">
          <Field
            label="New password"
            name="password"
            type="password"
            autoComplete="new-password"
            hint={`At least ${PASSWORD_MIN_CHARS} characters.`}
            value={values.password}
            onChange={set('password')}
            error={errors.password}
          />
          <Field
            label="Confirm new password"
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
            {pending ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </div>
    </>
  );
}
