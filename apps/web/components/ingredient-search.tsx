'use client';

import type { IngredientSummary } from '@allergy-checker/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { ApiError, MAX_QUERY_CHARS, searchIngredients } from '../lib/api';
import { matchedAlias, onRecordLine } from '../lib/ingredient-display';

const LIMIT = 8;
const DEBOUNCE_MS = 180;

const NO_MATCH =
  'No ingredient in the reference data matches that. It can still be typed into the list above — it will be reported as unrecognised.';

function truncationNote(items: IngredientSummary[], total: number): string {
  return `${items.length} of ${total.toLocaleString()} matches. Keep typing to narrow it.`;
}

/**
 * Manual entry, for the bottle in your hand with no list to paste.
 *
 * Search runs against the matcher's own key space on the server, so every name offered
 * here is one the analyser can resolve. That is the whole point of typing into this box
 * rather than the textarea: a picked name cannot come back as unrecognised.
 */
export function IngredientSearch({ onSelect }: { onSelect: (inciName: string) => void }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<IngredientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(-1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Closing the list and finding nothing both leave `items` empty, and only one of them
  // may say the corpus holds no such ingredient.
  const [dismissed, setDismissed] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    const trimmed = query.trim();
    setDismissed(false);
    if (trimmed.length === 0) {
      setItems([]);
      setTotal(0);
      setActive(-1);
      setError(null);
      setPending(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setPending(true);
      searchIngredients(trimmed, LIMIT, controller.signal)
        .then((response) => {
          setItems(response.items);
          setTotal(response.total);
          setActive(response.items.length > 0 ? 0 : -1);
          setError(null);
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return;
          setItems([]);
          setTotal(0);
          setError(cause instanceof ApiError ? cause.message : 'Could not search.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setPending(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const open = !dismissed && items.length > 0;

  const dismiss = () => {
    setDismissed(true);
    setActive(-1);
  };

  const choose = (item: IngredientSummary) => {
    onSelect(item.inciName);
    setQuery('');
    setItems([]);
    setTotal(0);
    setActive(-1);
  };

  /** Scrolls here rather than in an effect, so hovering never moves the list under the cursor. */
  const move = (delta: number) => {
    const next = (active + delta + items.length) % items.length;
    setActive(next);
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // This box sits inside the analysis form, so Enter must never reach it as a submit.
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = open && active >= 0 ? items[active] : undefined;
      if (item) choose(item);
      return;
    }
    if (event.key === 'Escape') {
      dismiss();
      return;
    }
    if (!open) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    }
  };

  const searching = !dismissed && query.trim().length > 0;
  const noMatch = searching && items.length === 0;
  const truncated = open && total > items.length;

  // Shown only when it adds something the list itself does not.
  const visible = error
    ? error
    : noMatch
      ? NO_MATCH
      : truncated
        ? truncationNote(items, total)
        : '';

  // A screen reader cannot glance at the list, so the count is always announced.
  const announced = error
    ? error
    : noMatch
      ? NO_MATCH
      : open
        ? truncated
          ? truncationNote(items, total)
          : `${items.length} ${items.length === 1 ? 'match' : 'matches'}.`
        : '';

  return (
    <div>
      <label htmlFor={listId} className="text-xs font-medium tracking-widest text-muted uppercase">
        Or add one ingredient at a time
      </label>
      <div className="relative mt-3">
        <input
          id={listId}
          value={query}
          maxLength={MAX_QUERY_CHARS}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={dismiss}
          placeholder="Start typing an INCI or common name"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
        />

        {open && (
          <ul
            ref={listRef}
            id={`${listId}-list`}
            role="listbox"
            className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-line bg-surface"
          >
            {items.map((item, index) => {
              const alias = matchedAlias(item, query);
              return (
                // The option carries the click itself: a focusable child inside role="option"
                // is invalid ARIA, and focus has to stay in the input for the combobox.
                <li
                  key={item.id}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(item)}
                  className={`cursor-pointer px-3 py-3 ${index === active ? 'bg-shell' : ''}`}
                >
                  <span className="block text-sm break-words">{item.inciName}</span>
                  {alias && (
                    <span className="mt-0.5 block text-xs text-muted">also printed as {alias}</span>
                  )}
                  <span className="mt-0.5 block text-xs text-muted">{onRecordLine(item)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p aria-live="polite" className="sr-only">
        {/* Only settled outcomes are announced: a live region that also carries the
            pending state speaks twice for every pause in typing. */}
        {pending ? '' : announced}
      </p>
      <p className="mt-2 text-xs text-muted">{pending ? 'Searching…' : visible}</p>
    </div>
  );
}
