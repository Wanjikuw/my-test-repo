'use client';

import { useEffect, useRef, useState } from 'react';

function describeCameraError(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was refused. Allow it in the browser settings, or choose a photo instead.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device. Choose a photo instead.';
  }
  if (name === 'NotReadableError') return 'The camera is in use by another application.';
  return 'The camera could not be opened. Choose a photo instead.';
}

function stopAll(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/**
 * A live view for reading a label where it is — the rear camera on a phone, the webcam on
 * a desktop. The file picker stays beside it: this is the quicker path, not the only one.
 *
 * The stream exists only while this is on screen, and every track is stopped the moment
 * a frame is taken or the view closes, so the camera light never stays on unasked.
 */
export function CameraCapture({
  onCapture,
  onClose,
}: {
  onCapture: (frame: HTMLCanvasElement) => void;
  onClose: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        window.isSecureContext
          ? 'This browser cannot open a camera. Choose a photo instead.'
          : 'The camera needs a secure (https) connection. Choose a photo instead.',
      );
      return;
    }

    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then(async (media) => {
        // Strict mode, or a fast close: the view went away while permission was pending.
        if (cancelled) return stopAll(media);
        stream.current = media;
        const element = video.current;
        if (!element) return;
        element.srcObject = media;
        await element.play();
        if (!cancelled) setReady(true);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(describeCameraError(cause));
      });

    return () => {
      cancelled = true;
      stopAll(stream.current);
      stream.current = null;
    };
  }, []);

  function capture() {
    const element = video.current;
    if (!element || element.videoWidth === 0) return;
    const frame = document.createElement('canvas');
    frame.width = element.videoWidth;
    frame.height = element.videoHeight;
    frame.getContext('2d')?.drawImage(element, 0, 0);
    stopAll(stream.current);
    stream.current = null;
    onCapture(frame);
  }

  return (
    <div className="mt-3 rounded-md border border-line bg-surface p-3">
      {error ? (
        <p className="p-2 text-sm text-avoid">{error}</p>
      ) : (
        <div className="relative overflow-hidden rounded bg-ink">
          <video
            ref={video}
            muted
            playsInline
            aria-label="Camera preview"
            className="aspect-[4/3] w-full object-contain"
          />
          {/* A guide to fill, not an ornament: the reader does best on a frame of only print. */}
          <div className="pointer-events-none absolute inset-6 rounded border border-shell/50" />
          {!ready && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-shell/70">
              Opening the camera…
            </p>
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Fill the frame with the ingredient list and hold still, in good light. Curved packs read
        best photographed flat-on to the middle of the list.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={capture}
          disabled={!ready}
          className="rounded-md bg-ink px-5 py-2.5 text-sm text-shell disabled:opacity-40"
        >
          Take the photo
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-line px-4 py-2.5 text-sm hover:border-muted"
        >
          Close the camera
        </button>
      </div>
    </div>
  );
}
