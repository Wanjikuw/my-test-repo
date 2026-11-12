import { describe, expect, it } from 'vitest';
import { displayName } from './display';

describe('displayName', () => {
  it('uses the first name given at sign-up', () => {
    expect(displayName({ email: 'ada@example.com', user_metadata: { first_name: ' Ada ' } })).toBe(
      'Ada',
    );
  });

  it('uses what Google supplies when there is no first name', () => {
    expect(displayName({ user_metadata: { given_name: 'Ada', full_name: 'Ada Lovelace' } })).toBe(
      'Ada',
    );
    expect(displayName({ user_metadata: { full_name: 'Ada King Lovelace' } })).toBe('Ada');
    expect(displayName({ user_metadata: { name: 'Ada Lovelace' } })).toBe('Ada');
  });

  it('falls back to the part of the address before the @', () => {
    expect(displayName({ email: 'ada@example.com', user_metadata: {} })).toBe('ada');
    expect(displayName({ email: 'ada@example.com' })).toBe('ada');
  });

  it('ignores metadata that is empty or is not text', () => {
    const user = { email: 'ada@example.com', user_metadata: { first_name: '  ', given_name: 7 } };
    expect(displayName(user)).toBe('ada');
  });

  it('has something to show even for an account with nothing', () => {
    expect(displayName({})).toBe('Account');
  });
});
