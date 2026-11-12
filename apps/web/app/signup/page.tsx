import type { Metadata } from 'next';
import { SignupForm } from '../../components/auth/signup-form';
import { firstParam, safeNextPath } from '../../lib/auth/paths';
import { getSupabaseConfig } from '../../lib/supabase/config';

export const metadata: Metadata = {
  title: 'Create an account - Angalia',
  description: 'Create an account to check ingredient labels against your skin profile.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <SignupForm
        next={safeNextPath(firstParam(params.next))}
        configured={getSupabaseConfig() !== null}
      />
    </main>
  );
}
