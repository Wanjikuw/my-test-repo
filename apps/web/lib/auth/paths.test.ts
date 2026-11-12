import { describe, expect, it } from 'vitest';
import {
  accessDecision,
  callbackUrl,
  DEFAULT_NEXT,
  firstParam,
  forgotPath,
  loginPath,
  RESET_PATH,
  routeAccess,
  safeNextPath,
  signupPath,
} from './paths';

describe('routeAccess', () => {
  it.each([
    '/',
    '/about',
    '/privacy',
    '/auth/callback',
    '/auth/confirm',
    '/robots.txt',
    '/icon.svg',
  ])('lets anyone read %s', (path) => {
    expect(routeAccess(path)).toBe('public');
  });

  it.each(['/login', '/signup'])('keeps %s for visitors who are not signed in', (path) => {
    expect(routeAccess(path)).toBe('guest-only');
  });

  it.each([
    '/check',
    '/check/history',
    '/account',
    '/a-page-added-next-month',
    '/api/anything',
    '/monitoring',
  ])('closes %s, because nothing says it is public', (path) => {
    expect(routeAccess(path)).toBe('protected');
  });

  it('does not take a lookalike for a public page', () => {
    for (const path of [
      '/About',
      '/about.html',
      '/about/team',
      '//about',
      '/auth',
      '/auth/other',
    ]) {
      expect(routeAccess(path)).toBe('protected');
    }
    expect(routeAccess('/login/extra')).toBe('protected');
  });

  it('reads a trailing slash as the same page', () => {
    expect(routeAccess('/about/')).toBe('public');
    expect(routeAccess('/login/')).toBe('guest-only');
    expect(routeAccess('/check/')).toBe('protected');
  });
});

describe('safeNextPath', () => {
  it('keeps a path on this site, with its query', () => {
    expect(safeNextPath('/check')).toBe('/check');
    expect(safeNextPath('/check?x=1&y=two')).toBe('/check?x=1&y=two');
    expect(safeNextPath('/about')).toBe('/about');
  });

  it('drops a fragment, which the server never sees', () => {
    expect(safeNextPath('/check#top')).toBe('/check');
  });

  it('resolves dot segments instead of passing them on', () => {
    expect(safeNextPath('/a/../check')).toBe('/check');
  });

  it('keeps an encoded slash as data and not as a second slash', () => {
    expect(safeNextPath('/%2F/evil.example')).toBe('/%2F/evil.example');
  });

  // Each of these is read by a browser as another site, or becomes one once it is parsed.
  it.each([
    'https://evil.example/check',
    'http://evil.example',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    '\\\\evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '/\r/evil.example',
    '/..//evil.example',
    '/.//evil.example',
    '/a/../..//evil.example',
    'javascript:alert(1)',
    'data:text/html,hello',
    'evil.example',
    'check',
    '   /check',
    '/check\u0000',
    '/check\u007f',
  ])('refuses %j and goes to the default instead', (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_NEXT);
  });

  it('refuses the sign-in pages and the handlers behind them, which would loop', () => {
    for (const value of ['/login', '/signup', '/login?next=/check', '/auth/callback?code=1']) {
      expect(safeNextPath(value)).toBe(DEFAULT_NEXT);
    }
  });

  it('refuses anything that is not a string', () => {
    for (const value of [undefined, null, 5, ['/check'], {}]) {
      expect(safeNextPath(value)).toBe(DEFAULT_NEXT);
    }
  });

  it('refuses an enormous value', () => {
    expect(safeNextPath(`/${'a'.repeat(600)}`)).toBe(DEFAULT_NEXT);
  });

  it('uses the fallback it is given', () => {
    expect(safeNextPath('//evil.example', '/about')).toBe('/about');
    expect(safeNextPath(undefined, '/about')).toBe('/about');
  });
});

describe('addresses', () => {
  it('builds the sign-in address with only what it was given', () => {
    expect(loginPath()).toBe('/login');
    expect(loginPath({ next: '/check' })).toBe('/login?next=%2Fcheck');
    expect(loginPath({ error: 'callback', next: '/check' })).toBe(
      '/login?error=callback&next=%2Fcheck',
    );
  });

  it('encodes the destination, so its own query cannot be read as the sign-in page’s', () => {
    expect(loginPath({ next: '/check?a=1&b=2' })).toBe('/login?next=%2Fcheck%3Fa%3D1%26b%3D2');
    expect(signupPath('/check?a=1&b=2')).toBe('/signup?next=%2Fcheck%3Fa%3D1%26b%3D2');
    expect(signupPath()).toBe('/signup');
  });

  it('builds the address Supabase returns the browser to', () => {
    expect(callbackUrl('https://angalia.example', '/check?a=1')).toBe(
      'https://angalia.example/auth/callback?next=%2Fcheck%3Fa%3D1',
    );
  });

  it('takes the first of a repeated query parameter', () => {
    expect(firstParam('a')).toBe('a');
    expect(firstParam(['a', 'b'])).toBe('a');
    expect(firstParam([])).toBeUndefined();
    expect(firstParam(undefined)).toBeUndefined();
  });
});

describe('accessDecision', () => {
  const input = { pathname: '/check', search: '', signedIn: false, next: null };

  it('sends a visitor who is not signed in from a protected page to sign in, and back after', () => {
    expect(accessDecision(input)).toEqual({ action: 'redirect', to: '/login?next=%2Fcheck' });
  });

  it('remembers the query of the page they asked for', () => {
    expect(accessDecision({ ...input, search: '?q=glycerin' })).toEqual({
      action: 'redirect',
      to: '/login?next=%2Fcheck%3Fq%3Dglycerin',
    });
  });

  it('cannot be made to carry a destination of the visitor’s choosing', () => {
    const decision = accessDecision({ ...input, search: '?next=//evil.example' });
    expect(decision).toEqual({
      action: 'redirect',
      to: '/login?next=%2Fcheck%3Fnext%3D%2F%2Fevil.example',
    });
  });

  it('lets a signed-in visitor through to a protected page', () => {
    expect(accessDecision({ ...input, signedIn: true })).toEqual({ action: 'continue' });
  });

  it('lets anyone through to a public page, signed in or not', () => {
    for (const signedIn of [true, false]) {
      expect(accessDecision({ ...input, pathname: '/privacy', signedIn })).toEqual({
        action: 'continue',
      });
    }
  });

  it('shows a visitor who is not signed in the sign-in page', () => {
    expect(accessDecision({ ...input, pathname: '/login' })).toEqual({ action: 'continue' });
    expect(accessDecision({ ...input, pathname: '/signup' })).toEqual({ action: 'continue' });
  });

  it('sends a signed-in visitor on from the sign-in page, to where they were going', () => {
    const signedIn = { ...input, pathname: '/login', signedIn: true };
    expect(accessDecision({ ...signedIn, next: '/check?q=1' })).toEqual({
      action: 'redirect',
      to: '/check?q=1',
    });
    expect(accessDecision({ ...signedIn, next: null })).toEqual({
      action: 'redirect',
      to: DEFAULT_NEXT,
    });
  });

  it('does not follow an unsafe destination off the site', () => {
    const decision = accessDecision({
      ...input,
      pathname: '/signup',
      signedIn: true,
      next: '//evil.example',
    });
    expect(decision).toEqual({ action: 'redirect', to: DEFAULT_NEXT });
  });
});

describe('the password reset pages', () => {
  const visitor = { search: '', next: null };

  it('keeps the request page for visitors who are not signed in', () => {
    expect(routeAccess('/forgot-password')).toBe('guest-only');
    expect(routeAccess('/forgot-password/')).toBe('guest-only');
  });

  it('closes the page for choosing a new password, which needs the session the link creates', () => {
    expect(routeAccess(RESET_PATH)).toBe('protected');
  });

  it('sends a visitor with no session from the new-password page to sign in, and back after', () => {
    expect(accessDecision({ ...visitor, pathname: RESET_PATH, signedIn: false })).toEqual({
      action: 'redirect',
      to: '/login?next=%2Freset-password',
    });
  });

  it('lets a visitor with a session reach the new-password page', () => {
    expect(accessDecision({ ...visitor, pathname: RESET_PATH, signedIn: true })).toEqual({
      action: 'continue',
    });
  });

  it('shows the request page to a visitor who is not signed in, and moves a signed-in one on', () => {
    const request = { ...visitor, pathname: '/forgot-password' };
    expect(accessDecision({ ...request, signedIn: false })).toEqual({ action: 'continue' });
    expect(accessDecision({ ...request, signedIn: true })).toEqual({
      action: 'redirect',
      to: DEFAULT_NEXT,
    });
  });

  it('accepts the new-password page as a destination, and refuses the request page, which loops', () => {
    expect(safeNextPath(RESET_PATH)).toBe(RESET_PATH);
    expect(safeNextPath('/forgot-password')).toBe(DEFAULT_NEXT);
  });

  it('builds the request page address, with a code only when there is one', () => {
    expect(forgotPath()).toBe('/forgot-password');
    expect(forgotPath('expired')).toBe('/forgot-password?error=expired');
  });

  it('encodes the code, so it cannot add parameters of its own', () => {
    expect(forgotPath('a&next=//evil.example')).toBe(
      '/forgot-password?error=a%26next%3D%2F%2Fevil.example',
    );
  });
});
