import { describe, expect, it, vi } from 'vitest';
import { deleteAccount, deletionErrorMessage, type DeletionClient } from './account';
import { PROFILE_STORAGE_KEY } from './profile-storage';

function storage(state: object | null) {
  const items = new Map<string, string>();
  if (state) items.set(PROFILE_STORAGE_KEY, JSON.stringify({ state }));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    removeItem: (key: string) => void items.delete(key),
  };
}

function client(error: unknown = null, signOut = vi.fn().mockResolvedValue({})) {
  const rpc = vi.fn().mockResolvedValue({ error });
  return { rpc, signOut, client: { rpc, auth: { signOut } } as DeletionClient };
}

describe('deleteAccount', () => {
  it('deletes through the database function, then ends the session on this device', async () => {
    const { rpc, signOut, client: c } = client();
    await deleteAccount(c, storage(null));

    expect(rpc).toHaveBeenCalledWith('delete_my_account');
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('forgets a profile that the account held, as signing out does', async () => {
    const store = storage({ syncedAt: '2026-01-01T00:00:00Z', dirty: false });
    await deleteAccount(client().client, store);
    expect(store.items.has(PROFILE_STORAGE_KEY)).toBe(false);
  });

  it('forgets the check history on this device', async () => {
    const store = storage(null);
    store.items.set('angalia-history', '{}');
    await deleteAccount(client().client, store);
    expect(store.items.has('angalia-history')).toBe(false);
  });

  it('keeps a profile that was never saved to the account', async () => {
    const store = storage({ syncedAt: null, dirty: true });
    await deleteAccount(client().client, store);
    expect(store.items.has(PROFILE_STORAGE_KEY)).toBe(true);
  });

  it('reports a refusal and leaves the session and the device alone', async () => {
    const store = storage({ syncedAt: '2026-01-01T00:00:00Z', dirty: false });
    const { signOut, client: c } = client({ code: '28000' });

    await expect(deleteAccount(c, store)).rejects.toMatchObject({ code: '28000' });
    expect(signOut).not.toHaveBeenCalled();
    expect(store.items.has(PROFILE_STORAGE_KEY)).toBe(true);
  });

  it('succeeds even when ending the session fails, because the account is already gone', async () => {
    const { client: c } = client(null, vi.fn().mockRejectedValue(new Error('no such user')));
    await expect(deleteAccount(c, storage(null))).resolves.toBeUndefined();
  });
});

describe('deletionErrorMessage', () => {
  it('says the script has not been run when the function is missing', () => {
    expect(deletionErrorMessage({ code: 'PGRST202' })).toContain('not available yet');
  });

  it('says to sign in again when the session has ended', () => {
    expect(deletionErrorMessage({ code: '28000' })).toContain('Sign in again');
  });

  it('never shows the service wording, and always says nothing was deleted', () => {
    const message = deletionErrorMessage({ message: 'permission denied for table users' });
    expect(message).not.toContain('permission');
    expect(message).toContain('Nothing was deleted');
  });
});
