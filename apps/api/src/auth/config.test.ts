import { describe, expect, it } from 'vitest';
import { resolveAuth } from './config';

const URL = 'https://abcdefgh.supabase.co';

describe('resolveAuth', () => {
  // Starting open because a variable is missing would be the worst way for this to fail.
  it('refuses to start in production without the project URL', () => {
    expect(() => resolveAuth({ NODE_ENV: 'production' })).toThrow(/SUPABASE_URL must be set/);
    expect(() => resolveAuth({ NODE_ENV: 'production', SUPABASE_URL: '  ' })).toThrow(
      /SUPABASE_URL must be set/,
    );
  });

  it('enforces sign-in in production once it has the project URL', () => {
    expect(typeof resolveAuth({ NODE_ENV: 'production', SUPABASE_URL: URL })).toBe('function');
  });

  it('can be switched off in production, on purpose and by name', () => {
    expect(resolveAuth({ NODE_ENV: 'production', AUTH_REQUIRED: 'false' })).toBeNull();
    expect(resolveAuth({ NODE_ENV: 'production', AUTH_REQUIRED: ' FALSE ' })).toBeNull();
  });

  it('stays open in development and in tests unless asked', () => {
    expect(resolveAuth({})).toBeNull();
    expect(resolveAuth({ NODE_ENV: 'development', SUPABASE_URL: URL })).toBeNull();
    expect(resolveAuth({ NODE_ENV: 'test' })).toBeNull();
  });

  it('enforces anywhere when asked, and then needs the project URL', () => {
    expect(typeof resolveAuth({ AUTH_REQUIRED: 'true', SUPABASE_URL: URL })).toBe('function');
    expect(typeof resolveAuth({ AUTH_REQUIRED: 'TRUE', SUPABASE_URL: URL })).toBe('function');
    expect(() => resolveAuth({ AUTH_REQUIRED: 'true' })).toThrow(/SUPABASE_URL must be set/);
  });

  it('treats an unrecognised value as not having been set', () => {
    expect(resolveAuth({ AUTH_REQUIRED: 'maybe' })).toBeNull();
    expect(() => resolveAuth({ NODE_ENV: 'production', AUTH_REQUIRED: 'maybe' })).toThrow(
      /SUPABASE_URL must be set/,
    );
  });

  it('rejects a project URL that is not a URL, or is not https', () => {
    const base = { AUTH_REQUIRED: 'true' };
    expect(() => resolveAuth({ ...base, SUPABASE_URL: 'abcdefgh.supabase.co' })).toThrow(
      /valid URL/,
    );
    expect(() => resolveAuth({ ...base, SUPABASE_URL: 'http://abcdefgh.supabase.co' })).toThrow(
      /https/,
    );
  });

  it('allows plain http only for a Supabase running on this machine', () => {
    const base = { AUTH_REQUIRED: 'true' };
    expect(typeof resolveAuth({ ...base, SUPABASE_URL: 'http://localhost:54321' })).toBe(
      'function',
    );
    expect(typeof resolveAuth({ ...base, SUPABASE_URL: 'http://127.0.0.1:54321' })).toBe(
      'function',
    );
  });
});
