import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from './forgot-password-form';
import { LoginForm } from './login-form';
import { ResetPasswordForm } from './reset-password-form';
import { SignupForm } from './signup-form';

const NOT_SET_UP = 'Sign-in is not set up for this site yet.';

afterEach(() => vi.unstubAllEnvs());

const FORMS: [string, (configured: boolean) => ReactElement][] = [
  ['sign-in', (configured) => <LoginForm next="/check" notice={null} configured={configured} />],
  ['sign-up', (configured) => <SignupForm next="/check" configured={configured} />],
  [
    'password reset request',
    (configured) => <ForgotPasswordForm notice={null} configured={configured} />,
  ],
  ['new password', (configured) => <ResetPasswordForm configured={configured} />],
];

const tags = (html: string, tag: string) => html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
// Both attributes stop a visitor typing, and neither says why.
const blocked = (html: string, tag: string) =>
  tags(html, tag).filter((element) => /\s(disabled|readonly)(=|\s|>)/i.test(element));

/**
 * A form that cannot be typed into looks broken, and says nothing about why. When sign-in is not
 * set up for a build the form still has to accept what is typed, and say so, so that a missing
 * setting is found by reading the page and not by wondering why it does nothing.
 */
describe.each(FORMS)('the %s form', (_name, render) => {
  it.each([true, false])('can be typed into and submitted when set up is %s', (configured) => {
    const html = renderToStaticMarkup(render(configured));

    expect(tags(html, 'input').length).toBeGreaterThan(0);
    expect(blocked(html, 'input')).toEqual([]);
    expect(blocked(html, 'button')).toEqual([]);
  });

  it('says that sign-in is not set up only when it is not', () => {
    expect(renderToStaticMarkup(render(false))).toContain(NOT_SET_UP);
    expect(renderToStaticMarkup(render(true))).not.toContain(NOT_SET_UP);
  });
});

describe('the notice that sign-in is not set up', () => {
  it('names the missing settings, for whoever is setting the site up', () => {
    const html = renderToStaticMarkup(<LoginForm next="/check" notice={null} configured={false} />);

    expect(html).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(html).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('tells a visitor to a live site only that it is not set up', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const html = renderToStaticMarkup(<LoginForm next="/check" notice={null} configured={false} />);

    expect(html).toContain(NOT_SET_UP);
    expect(html).not.toContain('NEXT_PUBLIC');
  });
});

describe('the forms and the fields they offer', () => {
  it('ask for what the sign-up needs, and a password twice', () => {
    const html = renderToStaticMarkup(<SignupForm next="/check" configured />);

    for (const name of ['firstName', 'lastName', 'email', 'password', 'confirmPassword']) {
      expect(html).toContain(`name="${name}"`);
    }
  });

  it('ask for an email address and a password on the sign-in', () => {
    const html = renderToStaticMarkup(<LoginForm next="/check" notice={null} configured />);

    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain('href="/forgot-password"');
  });

  it('show a reason when the sign-in page was sent one', () => {
    const html = renderToStaticMarkup(
      <LoginForm next="/check" notice="Sign-in could not be completed. Try again." configured />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('Sign-in could not be completed. Try again.');
  });
});
