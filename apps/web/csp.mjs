/**
 * The content security policy, built from the origins this deployment talks to.
 *
 * Plain JavaScript because next.config.mjs imports it and Next does not compile that file.
 *
 * `script-src` still allows 'unsafe-inline', because Next writes its start-up data into the
 * page as inline scripts and a nonce would force every page to render per request. What the
 * policy does buy: scripts can only load from this origin, the page can only call the
 * origins named below, it cannot be framed, and a form cannot be pointed elsewhere.
 * 'wasm-unsafe-eval' is for the OCR engine, which compiles WebAssembly.
 */

import { URL } from 'node:url';

/** The origin of a URL, or null when it is not one (an unset or malformed variable). */
function originOf(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * @param {{ apiUrl?: string; supabaseUrl?: string; development?: boolean }} options
 * @returns {string}
 */
export function buildCsp({ apiUrl, supabaseUrl, development = false } = {}) {
  const connect = ["'self'", originOf(apiUrl), originOf(supabaseUrl)].filter(Boolean);

  const directives = {
    'default-src': ["'self'"],
    // React's development build uses eval to rebuild stack traces; production never does.
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      "'wasm-unsafe-eval'",
      ...(development ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    // blob: and data: are the camera frame and the image the user chose.
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", 'blob:'],
    'worker-src': ["'self'", 'blob:'],
    'connect-src': connect,
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  const parts = Object.entries(directives).map(([name, sources]) => `${name} ${sources.join(' ')}`);
  if (!development) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}
