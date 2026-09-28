/**
 * Getting a photograph into the shape each reader wants. Browser-only: every function
 * here needs a canvas.
 */

/** Long side sent to the on-device reader: label type stays legible and tesseract stays quick. */
export const DEVICE_LONG_SIDE = 2000;
/** Long side sent to the remote reader: about 1,900 image tokens, well inside its limits. */
export const REMOTE_LONG_SIDE = 1600;

/**
 * Draws `source` into a new canvas whose long side is `longSide`, never enlarging by more
 * than `maxUpscale`. A 12-megapixel photo is mostly wasted work for a reader; a small crop
 * reads better enlarged a little.
 */
export function scaleToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  longSide: number,
  maxUpscale = 1,
): HTMLCanvasElement {
  const scale = Math.min(maxUpscale, longSide / Math.max(width, height, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot draw images.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Decodes a picked file, upright: `createImageBitmap` applies the camera's EXIF orientation. */
export async function fileToCanvas(file: Blob, longSide: number): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  try {
    return scaleToCanvas(bitmap, bitmap.width, bitmap.height, longSide);
  } finally {
    bitmap.close();
  }
}

/**
 * Greyscale, with levels stretched between the 1st and 99th percentile, in place.
 *
 * Label print is often low-contrast on a glossy or tinted pack, and tesseract binarises a
 * full-range grey image far better than a colour one. One pass builds the histogram and
 * one writes the result, so this is linear in the number of pixels.
 */
export function enhanceForOcr(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;
  const histogram = new Uint32Array(256);

  for (let i = 0; i < px.length; i += 4) {
    // Rec. 601 luma in integer arithmetic.
    const luma = ((px[i] ?? 0) * 77 + (px[i + 1] ?? 0) * 150 + (px[i + 2] ?? 0) * 29) >> 8;
    px[i] = luma;
    histogram[luma] = (histogram[luma] ?? 0) + 1;
  }

  const clip = (px.length / 4) * 0.01;
  let low = 0;
  let below = histogram[0] ?? 0;
  while (below < clip && low < 255) below += histogram[++low] ?? 0;
  let high = 255;
  let above = histogram[255] ?? 0;
  while (above < clip && high > 0) above += histogram[--high] ?? 0;
  // A nearly flat frame has no print worth stretching towards; leave it as plain grey.
  if (high - low < 16) {
    low = 0;
    high = 255;
  }
  const range = high - low;

  // Uint8ClampedArray clamps and rounds on write, so out-of-range values need no guard.
  for (let i = 0; i < px.length; i += 4) {
    const level = (((px[i] ?? 0) - low) * 255) / range;
    px[i] = level;
    px[i + 1] = level;
    px[i + 2] = level;
  }

  context.putImageData(image, 0, 0);
  return canvas;
}
