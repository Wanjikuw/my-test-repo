import { clearSyncedProfile } from './profile-storage';
import { clearHistory } from './history-storage';

/** The two calls deleting an account needs, so a test can stand in for the whole sign-in client. */
export interface DeletionClient {
  rpc(fn: 'delete_my_account'): PromiseLike<{ error: unknown }>;
  auth: { signOut(options: { scope: 'local' }): PromiseLike<unknown> };
}

/**
 * Deletes the signed-in person's account, then forgets the session on this device.
 *
 * The database function does the deleting (see drizzle/manual/0003_delete_account.sql). Once it
 * has run, the session token is for a user that no longer exists, so ending it can fail and is
 * not worth reporting: the account is gone either way.
 */
export async function deleteAccount(
  client: DeletionClient,
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
): Promise<void> {
  const { error } = await client.rpc('delete_my_account');
  if (error) throw error;

  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // See above.
  }
  clearSyncedProfile(storage);
  clearHistory(storage);
}

function field(error: unknown, key: 'code' | 'name'): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

/** What to tell someone whose deletion did not go through. The service's own wording is not shown. */
export function deletionErrorMessage(error: unknown): string {
  if (field(error, 'name') === 'AuthNotConfiguredError') {
    return 'Sign-in is not set up for this site yet.';
  }
  // PostgREST says the function does not exist: the database script has not been run.
  if (field(error, 'code') === 'PGRST202') {
    return 'Deleting an account is not available yet. Nothing was deleted.';
  }
  if (field(error, 'code') === '28000') {
    return 'Your sign-in has ended. Sign in again, then delete the account. Nothing was deleted.';
  }
  return 'The account could not be deleted. Nothing was deleted. Try again in a moment.';
}
