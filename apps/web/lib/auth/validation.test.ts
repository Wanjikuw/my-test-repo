import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  normaliseEmail,
  PASSWORD_MAX_BYTES,
  validateEmail,
  validateForgot,
  validateLogin,
  validatePassword,
  validateReset,
  validateSignup,
  type SignupValues,
} from './validation';

const VALID: SignupValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  password: 'correct horse',
  confirmPassword: 'correct horse',
};

describe('validateEmail', () => {
  it.each(['ada@example.com', ' ada@example.com ', 'a.b+tag@sub.example.co.uk'])(
    'accepts %j',
    (value) => {
      expect(validateEmail(value)).toBeNull();
    },
  );

  it.each(['', '   ', 'ada', 'ada@', '@example.com', 'ada@example', 'ada @example.com', 'a@b@c.d'])(
    'asks again for %j',
    (value) => {
      expect(validateEmail(value)).toEqual(expect.stringMatching(/email address/i));
    },
  );

  it('refuses an address longer than any can be, without running a pattern over it', () => {
    expect(validateEmail(`${'a'.repeat(250)}@example.com`)).not.toBeNull();
  });

  it('normalises to what the service stores', () => {
    expect(normaliseEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });
});

describe('validatePassword', () => {
  it('accepts a password of the right length', () => {
    expect(validatePassword('12345678')).toBeNull();
    expect(validatePassword('a'.repeat(PASSWORD_MAX_BYTES))).toBeNull();
  });

  it('asks for one, then for a longer one', () => {
    expect(validatePassword('')).toBe('Enter a password.');
    expect(validatePassword('1234567')).toBe('Use at least 8 characters.');
  });

  it('counts bytes, since the limit is in bytes', () => {
    // Forty characters, two bytes each: shorter than the limit in characters and over it in bytes.
    expect(validatePassword('é'.repeat(40))).toEqual(expect.stringContaining('72 bytes'));
    expect(validatePassword('a'.repeat(PASSWORD_MAX_BYTES + 1))).not.toBeNull();
  });

  it('does not strip spaces, which can be part of a passphrase', () => {
    expect(validatePassword('        ')).toBeNull();
  });
});

describe('validateLogin', () => {
  it('asks only for something in each box', () => {
    expect(validateLogin({ email: 'ada@example.com', password: 'x' })).toEqual({});
  });

  it('reports each box that has nothing valid in it', () => {
    const errors = validateLogin({ email: 'nope', password: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'password']);
  });

  it('does not apply the rules for new passwords to an old one', () => {
    expect(validateLogin({ email: 'ada@example.com', password: 'short' })).toEqual({});
  });
});

describe('validateSignup', () => {
  it('accepts a complete form', () => {
    const errors = validateSignup(VALID);
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it('asks for each name, and does not accept spaces as one', () => {
    const errors = validateSignup({ ...VALID, firstName: '   ', lastName: '' });
    expect(errors.firstName).toBe('Enter your first name.');
    expect(errors.lastName).toBe('Enter your last name.');
  });

  it('accepts names in any script, and names that are short or hyphenated', () => {
    for (const name of ['Wu', 'Nguyễn', 'Äbdi', 'Mary-Jane', "O'Neil", '李']) {
      expect(validateSignup({ ...VALID, firstName: name, lastName: name })).toEqual({});
    }
  });

  it('refuses a name too long to be one', () => {
    expect(validateSignup({ ...VALID, firstName: 'a'.repeat(81) }).firstName).toEqual(
      expect.stringContaining('80 characters'),
    );
  });

  it('says when the two passwords differ', () => {
    const errors = validateSignup({ ...VALID, confirmPassword: 'correct horsE' });
    expect(errors.confirmPassword).toBe('The two passwords do not match.');
  });

  it('asks for the confirmation when it is empty', () => {
    expect(validateSignup({ ...VALID, confirmPassword: '' }).confirmPassword).toBe(
      'Enter the password again to confirm it.',
    );
  });

  it('leaves the confirmation alone while the password itself is wrong', () => {
    const errors = validateSignup({ ...VALID, password: 'short', confirmPassword: '' });
    expect(errors.password).toBe('Use at least 8 characters.');
    expect(errors.confirmPassword).toBeUndefined();
  });

  it('reports every problem at once, so they are fixed in one pass', () => {
    const errors = validateSignup({
      firstName: '',
      lastName: '',
      email: 'nope',
      password: '',
      confirmPassword: '',
    });
    expect(Object.keys(errors).sort()).toEqual(['email', 'firstName', 'lastName', 'password']);
  });
});

describe('validateForgot', () => {
  it('accepts an address, and asks again for one that is not', () => {
    expect(validateForgot({ email: 'ada@example.com' })).toEqual({});
    expect(validateForgot({ email: ' ada@example.com ' })).toEqual({});
    expect(validateForgot({ email: '' }).email).toBe('Enter your email address.');
    expect(validateForgot({ email: 'ada' }).email).toEqual(
      expect.stringContaining('valid email address'),
    );
  });
});

describe('validateReset', () => {
  it('accepts a password entered twice', () => {
    expect(validateReset({ password: 'correct horse', confirmPassword: 'correct horse' })).toEqual(
      {},
    );
  });

  it('applies the rules for choosing a password, since this is choosing one', () => {
    expect(validateReset({ password: '', confirmPassword: '' }).password).toBe('Enter a password.');
    expect(validateReset({ password: '1234567', confirmPassword: '1234567' }).password).toBe(
      'Use at least 8 characters.',
    );
    expect(
      validateReset({ password: 'é'.repeat(40), confirmPassword: 'é'.repeat(40) }).password,
    ).toEqual(expect.stringContaining('72 bytes'));
  });

  it('says when the two entries differ, and when the second is missing', () => {
    expect(
      validateReset({ password: 'correct horse', confirmPassword: 'correct horsE' })
        .confirmPassword,
    ).toBe('The two passwords do not match.');
    expect(validateReset({ password: 'correct horse', confirmPassword: '' }).confirmPassword).toBe(
      'Enter the password again to confirm it.',
    );
  });

  it('leaves the confirmation alone while the password itself is wrong', () => {
    const errors = validateReset({ password: 'short', confirmPassword: '' });
    expect(errors.password).toBe('Use at least 8 characters.');
    expect(errors.confirmPassword).toBeUndefined();
  });
});
