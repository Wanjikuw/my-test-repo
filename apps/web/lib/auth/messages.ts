export type AuthAction =
  'sign-in' | 'sign-up' | 'google' | 'recover' | 'update-password' | 'resend';

const NETWORK = 'Could not reach the sign-in service. Check your connection and try again.';
const TOO_MANY = 'Too many attempts. Wait a few minutes and try again.';

/** Said by every page that finds out the build was made without the sign-in settings. */
export const NOT_CONFIGURED = 'Sign-in is not set up for this site yet.';

function text(error: unknown, key: 'code' | 'name'): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function status(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = (error as Record<string, unknown>)['status'];
  return typeof value === 'number' ? value : undefined;
}

/** Signing in failed only because the address has not been confirmed, which a new email can fix. */
export function needsConfirmation(error: unknown): boolean {
  return text(error, 'code') === 'email_not_confirmed';
}

/** There is no session to act on: the reset link was not followed, or the session has ended. */
export function sessionMissing(error: unknown): boolean {
  return (
    text(error, 'name') === 'AuthSessionMissingError' || text(error, 'code') === 'session_not_found'
  );
}

/**
 * What to tell someone when the sign-in service refuses. The service's own wording is never
 * shown: it is written for developers, and for a wrong password it must say no more than
 * "not correct", or it tells a stranger which addresses have accounts.
 */
export function authErrorMessage(error: unknown, action: AuthAction): string {
  // Thrown by the browser client when there is nothing to build it from.
  if (text(error, 'name') === 'AuthNotConfiguredError') return NOT_CONFIGURED;

  if (
    text(error, 'name') === 'AuthRetryableFetchError' ||
    status(error) === 0 ||
    error instanceof TypeError
  ) {
    return NETWORK;
  }

  if (sessionMissing(error)) {
    return 'This page works only from the link in the reset email, and that link has ended. Request a new one.';
  }

  switch (text(error, 'code')) {
    case 'invalid_credentials':
      return 'The email address or password is not correct.';
    case 'email_not_confirmed':
      return 'This email address has not been confirmed. Open the link in the message we sent, then sign in.';
    case 'user_already_exists':
    case 'email_exists':
      return 'An account with this email address already exists. Sign in instead.';
    case 'weak_password':
      return 'That password is too easy to guess. Choose a longer one, or one that is less common.';
    case 'same_password':
      return 'The new password must be different from the current one.';
    case 'signup_disabled':
      return 'New accounts cannot be created at the moment.';
    case 'email_address_invalid':
      return 'That email address is not accepted. Check it for a typing mistake.';
    case 'email_address_not_authorized':
      return 'A message cannot be sent to that address yet. Sign up with Google instead.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return TOO_MANY;
    default:
      break;
  }

  if (status(error) === 429) return TOO_MANY;
  if (action === 'google') return 'Google sign-in could not be started. Try again in a moment.';
  return 'Something went wrong. Try again in a moment.';
}

/**
 * The sign-in routes send people back to the login page with a short code in the address. Only
 * the codes listed here are turned into words, so the page can never be made to display text
 * that someone wrote into a link.
 */
export function loginNotice(code: string | null | undefined): string | null {
  switch (code) {
    case 'access_denied':
      return 'Sign-in with Google was cancelled. Try again, or use your email address.';
    case 'callback':
      return 'Sign-in could not be completed. Try again.';
    case 'confirm':
      return 'That confirmation link has expired or has already been used. Sign in, or create the account again.';
    case 'config':
      return NOT_CONFIGURED;
    default:
      return null;
  }
}

/** The same rule for the reset page, which is sent a code when its link did not work. */
export function forgotNotice(code: string | null | undefined): string | null {
  switch (code) {
    case 'expired':
      return 'That link has expired or has already been used. Request a new one below.';
    default:
      return null;
  }
}
