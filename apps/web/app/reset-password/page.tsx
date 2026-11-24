import type { Metadata } from 'next';
import { ResetPasswordForm } from '../../components/auth/reset-password-form';
import { getSupabaseConfig } from '../../lib/supabase/config';

export const metadata: Metadata = {
  title: 'Choose a new password - Angalia',
  description: 'Choose a new password for your account.',
};

// Behind sign-in like every other page: the emailed link signs the person in first, which is
// what lets this form change the password of the account the link was sent to and no other.
export default function ResetPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <ResetPasswordForm configured={getSupabaseConfig() !== null} />
    </main>
  );
}
