import { describe, expect, it } from 'vitest';
import {
  authErrorMessage,
  forgotNotice,
  loginNotice,
  needsConfirmation,
  NOT_CONFIGURED,
  sessionMissing,
} from './messages';

describe('authErrorMessage', () => {
  it('says only that the email address or password is not correct, whichever it was', () => {
    const message = authErrorMessage({ code: 'invalid_credentials', status: 400 }, 'sign-in');
    expect(message).toBe('The email address or password is not correct.');
  });

  it.each([
    ['email_not_confirmed', /not been confirmed/],
    ['user_already_exists', /already exists/],
    ['email_exists', /already exists/],
    ['weak_password', /too easy to guess/],
    ['same_password', /must be different from the current one/],
    ['signup_disabled', /cannot be created/],
    ['email_address_invalid', /not accepted/],
    ['email_address_not_authorized', /Sign up with Google/],
    ['over_request_rate_limit', /Too many attempts/],
    ['over_email_send_rate_limit', /Too many attempts/],
  ])('explains %s', (code, expected) => {
    expect(authErrorMessage({ code, status: 400 }, 'sign-up')).toMatch(expected);
  });

  it('reads a 429 with no code as too many attempts', () => {
    expect(authErrorMessage({ status: 429 }, 'sign-in')).toMatch(/Too many attempts/);
  });

  it('tells a lost connection apart from a refusal', () => {
    const network = /Could not reach the sign-in service/;
    expect(authErrorMessage({ name: 'AuthRetryableFetchError', status: 0 }, 'sign-in')).toMatch(
      network,
    );
    expect(authErrorMessage({ status: 0 }, 'sign-in')).toMatch(network);
    expect(authErrorMessage(new TypeError('Failed to fetch'), 'sign-in')).toMatch(network);
  });

  it('never shows the service’s own words, which are written for developers', () => {
    const message = authErrorMessage(
      { code: 'unexpected_failure', status: 500, message: 'relation "auth.users" does not exist' },
      'sign-in',
    );
    expect(message).toBe('Something went wrong. Try again in a moment.');
    expect(message).not.toContain('relation');
  });

  it('has its own wording when Google could not be started', () => {
    expect(authErrorMessage({ code: 'unexpected_failure' }, 'google')).toMatch(/Google sign-in/);
  });

  it('copes with something that is not an error object at all', () => {
    for (const value of [undefined, null, 'boom', 42]) {
      expect(authErrorMessage(value, 'sign-in')).toBe(
        'Something went wrong. Try again in a moment.',
      );
    }
  });

  it('says the reset link has ended when there is no session to change a password for', () => {
    const message = authErrorMessage(
      { name: 'AuthSessionMissingError', status: 400 },
      'update-password',
    );
    expect(message).toMatch(/reset email/);
    expect(message).toMatch(/Request a new one/);
    expect(authErrorMessage({ code: 'session_not_found' }, 'update-password')).toBe(message);
  });

  it('says sign-in is not set up when there is nothing to build the client from', () => {
    const notSetUp = Object.assign(new Error('Sign-in is not configured for this site.'), {
      name: 'AuthNotConfiguredError',
    });
    for (const action of [
      'sign-in',
      'sign-up',
      'google',
      'recover',
      'update-password',
      'resend',
    ] as const) {
      expect(authErrorMessage(notSetUp, action)).toBe(NOT_CONFIGURED);
    }
    expect(loginNotice('config')).toBe(NOT_CONFIGURED);
  });

  it('gives the same wording for every action, bar the one that names Google', () => {
    const failure = { code: 'unexpected_failure', status: 500 };
    for (const action of ['sign-in', 'sign-up', 'recover', 'update-password', 'resend'] as const) {
      expect(authErrorMessage(failure, action)).toBe(
        'Something went wrong. Try again in a moment.',
      );
    }
  });
});

describe('needsConfirmation', () => {
  it('is true only when the address has not been confirmed, which a new email can fix', () => {
    expect(needsConfirmation({ code: 'email_not_confirmed', status: 400 })).toBe(true);
    expect(needsConfirmation({ code: 'invalid_credentials', status: 400 })).toBe(false);
    for (const value of [undefined, null, 'email_not_confirmed', 42, {}]) {
      expect(needsConfirmation(value)).toBe(false);
    }
  });
});

describe('sessionMissing', () => {
  it('recognises a missing session by its name or its code', () => {
    expect(sessionMissing({ name: 'AuthSessionMissingError' })).toBe(true);
    expect(sessionMissing({ code: 'session_not_found' })).toBe(true);
    expect(sessionMissing({ code: 'weak_password', name: 'AuthApiError' })).toBe(false);
    for (const value of [undefined, null, 'AuthSessionMissingError', {}]) {
      expect(sessionMissing(value)).toBe(false);
    }
  });
});

describe('forgotNotice', () => {
  it('has words for a link that had run out', () => {
    expect(forgotNotice('expired')).toMatch(/expired or has already been used/);
  });

  // The code comes from an address anyone can write, so it must never be shown as it arrived.
  it.each([
    '<script>alert(1)</script>',
    'Call 0800 000 000.',
    'toString',
    '__proto__',
    '',
    null,
    undefined,
  ])('shows nothing for %j', (code) => {
    expect(forgotNotice(code)).toBeNull();
  });
});

describe('loginNotice', () => {
  it.each(['access_denied', 'callback', 'confirm', 'config'])('has words for %s', (code) => {
    expect(loginNotice(code)).toEqual(expect.any(String));
  });

  // The code comes from an address anyone can write, so it must never be shown as it arrived.
  it.each([
    '<script>alert(1)</script>',
    'Your account has been locked. Call 0800 000 000.',
    'toString',
    '__proto__',
    '',
    null,
    undefined,
  ])('shows nothing for %j', (code) => {
    expect(loginNotice(code)).toBeNull();
  });
});
