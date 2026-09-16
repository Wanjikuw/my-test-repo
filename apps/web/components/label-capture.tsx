'use client';

import { useRef, useState } from 'react';

/**
 * Photograph the back of a bottle instead of typing it.
 *
 * `capture="environment"` on a file input opens the rear camera on a phone and a file
 * picker on a desktop, which covers both without touching getUserMedia. The recognised
 * text goes into the same textarea the user could have typed into, so it stays editable —
 * OCR misreads are the norm on curved packaging, and a result the user cannot correct
 * would be worse than no camera at all.
 *
 * tesseract.js and its ~17 MB of model data are imported on first use only. Loading them
 * at startup would make everyone pay for a feature most sessions never touch.
 */
export function LabelCapture({ onText }: { onText: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function read(file: File) {
    setError(null);
    setProgress(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', undefined, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = data.text.replace(/\s*\n\s*/g, ' ').trim();
      if (text.length === 0) {
        setError('No text could be read from that photo. Try again in better light.');
      } else {
        onText(text);
      }
    } catch {
      setError('The photo could not be read. You can type the list instead.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void read(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={progress !== null}
        className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
      >
        {progress === null ? 'Photograph the label' : `Reading… ${progress}%`}
      </button>

      {progress !== null && (
        <p className="mt-2 text-xs text-muted">
          Reading happens on your device. The photo is not uploaded anywhere.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-avoid">{error}</p>}
    </div>
  );
}
