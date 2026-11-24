export interface AccountUser {
  email?: string | undefined;
  user_metadata?: Record<string, unknown> | undefined;
}

function pick(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * What to call the person in the header. The sign-up form stores `first_name`; Google supplies
 * `given_name` and `full_name`. An address is the last resort, and only the part before the @.
 */
export function displayName(user: AccountUser): string {
  const metadata = user.user_metadata ?? {};
  const first = pick(metadata, 'first_name') ?? pick(metadata, 'given_name');
  if (first) return first;

  const full = pick(metadata, 'full_name') ?? pick(metadata, 'name');
  if (full) return full.split(/\s+/)[0] ?? full;

  return user.email?.split('@')[0] || 'Account';
}
