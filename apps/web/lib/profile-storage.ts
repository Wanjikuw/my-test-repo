/** Where the profile is kept in the browser. Its own file so a page can clear it without loading the store. */
export const PROFILE_STORAGE_KEY = 'angalia-profile';

/**
 * Forgets the profile on this device, but only once the account holds an up-to-date copy of it,
 * so signing out on a shared computer leaves nothing behind and never loses an unsaved edit.
 */
export function clearSyncedProfile(storage: Pick<Storage, 'getItem' | 'removeItem'>): void {
  try {
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return;
    const state = (JSON.parse(raw) as { state?: { syncedAt?: unknown; dirty?: unknown } }).state;
    if (typeof state?.syncedAt === 'string' && state.dirty === false) {
      storage.removeItem(PROFILE_STORAGE_KEY);
    }
  } catch {
    // Unreadable storage is not worth blocking a sign-out over.
  }
}
