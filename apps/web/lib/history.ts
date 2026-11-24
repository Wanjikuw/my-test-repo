'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HISTORY_STORAGE_KEY } from './history-storage';

export const HISTORY_LIMIT = 10;

export interface HistoryEntry {
  /** ISO time of the check. */
  at: string;
  /** The label as it was checked, so it can be put back and checked again. */
  label: string;
  tier: string;
  identified: number;
  total: number;
}

/** Newest first, one entry per distinct label, capped. Checking the same label again moves it up. */
export function pushEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  limit = HISTORY_LIMIT,
): HistoryEntry[] {
  const key = entry.label.trim().toLowerCase();
  const rest = entries.filter((e) => e.label.trim().toLowerCase() !== key);
  return [entry, ...rest].slice(0, limit);
}

interface HistoryState {
  entries: HistoryEntry[];
  record: (entry: HistoryEntry) => void;
  clear: () => void;
}

/** The last few checks, held on this device only. Nothing here is ever sent anywhere. */
export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      record: (entry) => set((state) => ({ entries: pushEntry(state.entries, entry) })),
      clear: () => set({ entries: [] }),
    }),
    { name: HISTORY_STORAGE_KEY },
  ),
);
