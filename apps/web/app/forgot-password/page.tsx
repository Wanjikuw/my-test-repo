import type { Metadata } from 'next';
import { ForgotPasswordForm } from '../../components/auth/forgot-password-form';
import { forgotNotice } from '../../lib/auth/messages';
import { firstParam } from '../../lib/auth/paths';
import { getSupabaseConfig } from '../../lib/supabase/config';

export const metadata: Metadata = {
  title: 'Reset your password - Angalia',
  description: 'Ask for a link to choose a new password.',
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <ForgotPasswordForm
        notice={forgotNotice(firstParam(params.error))}
        configured={getSupabaseConfig() !== null}
      />
    </main>
  );
}
