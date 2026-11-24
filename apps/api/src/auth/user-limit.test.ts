import { describe, expect, it } from 'vitest';
import { createUserLimiter, resolveUserLimit } from './user-limit';

describe('createUserLimiter', () => {
  it('allows up to the budget, then refuses with the time left', () => {
    let t = 0;
    const check = createUserLimiter({ max: 2, windowMs: 60_000 }, () => t);

    expect(check('a').allowed).toBe(true);
    expect(check('a').allowed).toBe(true);
    t = 10_000;
    expect(check('a')).toEqual({ allowed: false, retryAfterSeconds: 50 });
  });

  it('counts each user separately', () => {
    const check = createUserLimiter({ max: 1, windowMs: 60_000 }, () => 0);

    expect(check('a').allowed).toBe(true);
    expect(check('a').allowed).toBe(false);
    expect(check('b').allowed).toBe(true);
  });

  it('starts a fresh window once the old one has passed', () => {
    let t = 0;
    const check = createUserLimiter({ max: 1, windowMs: 1_000 }, () => t);

    check('a');
    expect(check('a').allowed).toBe(false);
    t = 1_000;
    expect(check('a').allowed).toBe(true);
  });
});

describe('resolveUserLimit', () => {
  it('defaults to 60 a minute and ignores a bad value', () => {
    expect(resolveUserLimit({}).max).toBe(60);
    expect(resolveUserLimit({ USER_RATE_LIMIT_MAX: 'lots' }).max).toBe(60);
    expect(resolveUserLimit({ USER_RATE_LIMIT_MAX: '5' }).max).toBe(5);
  });
});
