/** Where past checks are kept in the browser. Its own file so a page can clear it without the store. */
export const HISTORY_STORAGE_KEY = 'angalia-history';

/** Past labels are the person's own, so they go when the person signs out or deletes the account. */
export function clearHistory(storage: Pick<Storage, 'removeItem'>): void {
  try {
    storage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // Unreadable storage is not worth blocking a sign-out over.
  }
}
