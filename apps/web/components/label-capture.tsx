'use client';

import { useEffect, useRef, useState } from 'react';
import { DEVICE_LONG_SIDE, enhanceForOcr, fileToCanvas, scaleToCanvas } from '../lib/image';
import { cleanOcrText } from '../lib/ocr-text';
import { CameraCapture } from './camera-capture';

type TesseractWorker = Awaited<ReturnType<(typeof import('tesseract.js'))['createWorker']>>;

const OCR_ASSETS = '/ocr';

/**
 * Read the back of a bottle instead of typing it: live through the camera, or from a photo
 * already taken.
 *
 * The photo is read by tesseract.js on the device, so it never leaves the phone. The text
 * lands in the same editable box as typed text — OCR misreads are the norm on curved
 * packaging, and a result the user cannot correct would be worse than no camera at all.
 *
 * tesseract.js and its model data are imported on first use and the worker is kept for the
 * rest of the visit, so a second photo does not pay the start-up again.
 */
export function LabelCapture({ onText }: { onText: (text: string) => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const worker = useRef<Promise<TesseractWorker> | null>(null);
  const [camera, setCamera] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = status !== null;

  useEffect(
    () => () => {
      void worker.current?.then((w) => w.terminate()).catch(() => undefined);
    },
    [],
  );

  function deviceWorker(): Promise<TesseractWorker> {
    worker.current ??= (async () => {
      const { createWorker, PSM } = await import('tesseract.js');
      const created = await createWorker('eng', undefined, {
        // Served from this site (see scripts/copy-ocr-assets.mjs), so no third party is
        // contacted and the content security policy can name 'self' alone. The worker is
        // loaded by URL, not wrapped in a blob, for the same reason.
        workerPath: `${OCR_ASSETS}/worker.min.js`,
        corePath: OCR_ASSETS,
        langPath: `${OCR_ASSETS}/lang`,
        workerBlobURL: false,
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setStatus(`Reading on this device… ${Math.round(m.progress * 100)}%`);
          } else if (m.status.startsWith('loading')) {
            setStatus('Loading the on-device reader…');
          }
        },
      });
      // A cropped label is one block of text; the default page segmentation hunts for columns.
      await created.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
      return created;
    })().catch((cause: unknown) => {
      worker.current = null;
      throw cause;
    });
    return worker.current;
  }

  async function readOnDevice(frame: HTMLCanvasElement): Promise<string> {
    const prepared = enhanceForOcr(
      scaleToCanvas(frame, frame.width, frame.height, DEVICE_LONG_SIDE, 2),
    );
    const { data } = await (await deviceWorker()).recognize(prepared);
    return data.text;
  }

  async function read(frame: HTMLCanvasElement) {
    setError(null);
    setStatus('Preparing the photo…');
    try {
      const text = cleanOcrText(await readOnDevice(frame));
      if (text.length === 0) {
        setError('No text could be read from that photo. Try again closer, in better light.');
      } else {
        onText(text);
      }
    } catch {
      setError('The photo could not be read. You can type the list instead.');
    } finally {
      setStatus(null);
    }
  }

  async function readFile(file: File) {
    let frame: HTMLCanvasElement;
    try {
      frame = await fileToCanvas(file, DEVICE_LONG_SIDE);
    } catch {
      setError('That file could not be opened as an image.');
      return;
    }
    await read(frame);
  }

  return (
    <div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void readFile(file);
          e.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCamera(true)}
          disabled={busy || camera}
          className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
        >
          Use the camera
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="rounded-md border border-line px-4 py-2 text-sm hover:border-muted disabled:opacity-40"
        >
          Choose a photo
        </button>
      </div>

      <p className="mt-2 text-xs text-muted">
        Reading happens on this device. The photo is not uploaded anywhere.
      </p>

      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onCapture={(frame) => {
            setCamera(false);
            void read(frame);
          }}
        />
      )}

      {status && (
        <p aria-live="polite" className="mt-2 text-sm text-muted">
          {status}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-avoid">{error}</p>}
    </div>
  );
}
