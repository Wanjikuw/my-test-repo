import type { Metadata } from 'next';
import { LoginForm } from '../../components/auth/login-form';
import { loginNotice } from '../../lib/auth/messages';
import { firstParam, safeNextPath } from '../../lib/auth/paths';
import { getSupabaseConfig } from '../../lib/supabase/config';

export const metadata: Metadata = {
  title: 'Sign in - Angalia',
  description: 'Sign in to check an ingredient label against your skin profile.',
};

// Reading the address makes this page render per request. That is what lets the form arrive
// already knowing where to go next, instead of appearing after the scripts have run.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <LoginForm
        next={safeNextPath(firstParam(params.next))}
        notice={loginNotice(firstParam(params.error))}
        configured={getSupabaseConfig() !== null}
      />
    </main>
  );
}
