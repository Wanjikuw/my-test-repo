'use client';

import { useRef, useState } from 'react';
import { ApiError, lookupProduct } from '../lib/api';
import { normaliseBarcode } from '../lib/barcode';

/**
 * Fill the list from a product's barcode. The text comes from Open Beauty Facts, which is
 * entered by volunteers, so it goes into the same editable box as typed text: the user can
 * check it against the pack before anything is scored.
 */
export function BarcodeLookup({ onText }: { onText: (text: string) => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [found, setFound] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  async function look() {
    const barcode = normaliseBarcode(value);
    if (!barcode) {
      setFound(null);
      setMessage('A barcode is 8 to 14 digits, printed under the bars.');
      return;
    }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setMessage(null);
    setFound(null);
    try {
      const product = await lookupProduct(barcode, controller.signal);
      onText(product.ingredientsText);
      setFound([product.brand, product.name].filter(Boolean).join(' – ') || barcode);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setMessage(
        cause instanceof ApiError
          ? cause.message
          : 'The product could not be looked up. You can type the list instead.',
      );
    } finally {
      if (pending.current === controller) setBusy(false);
    }
  }

  return (
    <div>
      <label htmlFor="barcode" className="text-xs text-muted">
        Or look it up by barcode
      </label>
      <div className="mt-1.5 flex gap-2">
        <input
          id="barcode"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void look();
            }
          }}
          placeholder="3600550000000"
          className="w-full max-w-60 rounded-md border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <button
          type="button"
          onClick={() => void look()}
          disabled={busy || value.trim().length === 0}
          className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
        >
          {busy ? 'Looking…' : 'Look up'}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Ingredient lists come from{' '}
        <a
          href="https://world.openbeautyfacts.org"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Open Beauty Facts
        </a>
        , a volunteer-built database. Check them against the pack.
      </p>
      <div aria-live="polite">
        {found && <p className="mt-2 text-sm text-muted">Filled in from {found}.</p>}
        {message && <p className="mt-2 text-sm text-avoid">{message}</p>}
      </div>
    </div>
  );
}
