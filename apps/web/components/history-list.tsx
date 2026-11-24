'use client';

import { TIER_LABEL } from '../lib/annotate';
import { useHistory } from '../lib/history';

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Recent checks, kept on this device only. Choosing one puts its label back to be checked again. */
export function HistoryList({ onPick }: { onPick: (label: string) => void }) {
  const entries = useHistory((s) => s.entries);
  const clear = useHistory((s) => s.clear);
  if (entries.length === 0) return null;

  return (
    <section aria-label="Recent checks" className="mt-10 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-medium">Recent checks</h2>
        <button
          type="button"
          onClick={clear}
          className="text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear
        </button>
      </div>
      <p className="mt-1 text-muted">Kept on this device only.</p>
      <ul className="mt-3 divide-y divide-line rounded-md border border-line">
        {entries.map((entry) => (
          <li key={entry.at + entry.label}>
            <button
              type="button"
              onClick={() => onPick(entry.label)}
              className="flex w-full items-baseline gap-3 px-4 py-3 text-left hover:bg-surface"
            >
              <span className="shrink-0 font-medium">
                {TIER_LABEL[entry.tier as keyof typeof TIER_LABEL] ?? entry.tier}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">{entry.label}</span>
              <span className="shrink-0 text-muted">{when(entry.at)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
