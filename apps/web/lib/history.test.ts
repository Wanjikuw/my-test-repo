import { describe, expect, it } from 'vitest';
import { clearHistory, HISTORY_STORAGE_KEY } from './history-storage';
import { pushEntry, type HistoryEntry } from './history';

const entry = (label: string, at = '2026-01-01T00:00:00Z'): HistoryEntry => ({
  at,
  label,
  tier: 'Safe',
  identified: 1,
  total: 1,
});

describe('pushEntry', () => {
  it('puts the newest first', () => {
    const out = pushEntry([entry('Aqua')], entry('Glycerin'));
    expect(out.map((e) => e.label)).toEqual(['Glycerin', 'Aqua']);
  });

  it('moves a label checked again to the top instead of listing it twice', () => {
    const out = pushEntry(
      [entry('Aqua'), entry('Glycerin')],
      entry(' aqua ', '2026-02-02T00:00:00Z'),
    );
    expect(out).toHaveLength(2);
    expect(out[0]?.at).toBe('2026-02-02T00:00:00Z');
  });

  it('keeps only the most recent few', () => {
    let out: HistoryEntry[] = [];
    for (let i = 0; i < 15; i++) out = pushEntry(out, entry(`label ${i}`));
    expect(out).toHaveLength(10);
    expect(out[0]?.label).toBe('label 14');
  });
});

describe('clearHistory', () => {
  it('removes the stored history and survives unreadable storage', () => {
    const removed: string[] = [];
    clearHistory({ removeItem: (key) => void removed.push(key) });
    expect(removed).toEqual([HISTORY_STORAGE_KEY]);
    expect(() =>
      clearHistory({
        removeItem: () => {
          throw new Error('blocked');
        },
      }),
    ).not.toThrow();
  });
});
