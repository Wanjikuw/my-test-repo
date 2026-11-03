/**
 * Every call the browser makes to the API.
 *
 * `NEXT_PUBLIC_API_URL` is inlined at build time. The localhost fallback serves
 * development only: `next.config.mjs` refuses a Vercel production build without it, so a
 * deployed bundle can never quietly call a machine that is not there.
 */
import type {
  AnalyzeResponse,
  Capabilities,
  IngredientSearchResponse,
  NotesResponse,
  OcrResponse,
  SkinType,
  SunExposure,
} from '@allergy-checker/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * The API runs on a plan that puts it to sleep when idle and needs about a minute to wake.
 * Past the first figure the caller is told why the wait is long; past the second the request
 * is abandoned, so a stalled connection ends in a message and not in a button that says
 * "Checking…" for ever.
 */
const SLOW_AFTER_MS = 4_000;
const GIVE_UP_AFTER_MS = 90_000;

const UNREACHABLE = 'Could not reach the service. Check your connection and try again.';
const TOO_SLOW =
  'The service did not answer in time. It may be starting up: wait a moment and try again.';
const UNREADABLE = 'The service sent an answer that could not be read. Try again in a moment.';

/** Matches the API's own cap, so an over-long query is refused before it leaves the browser. */
export const MAX_QUERY_CHARS = 200;

export interface AnalyzeInput {
  label: string;
  skinType: SkinType | null;
  sunExposure: SunExposure | null;
  declaredAllergies: string[];
}

/** A 4xx from the API describes the caller's input, so its message is worth showing. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions {
  /** Called once if no answer has arrived after a few seconds. */
  onSlow?: () => void;
}

function isAbort(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === 'AbortError';
}

/**
 * One request with a deadline. `signal` is the caller's own, for replacing a request that is
 * no longer wanted: that is rethrown as an abort and never reported, whereas a deadline that
 * runs out is.
 */
async function request<T>(
  path: string,
  init: RequestInit,
  options: RequestOptions = {},
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forward, { once: true });

  const deadline = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, GIVE_UP_AFTER_MS);
  const slow = options.onSlow ? setTimeout(options.onSlow, SLOW_AFTER_MS) : undefined;

  try {
    const response = await fetch(`${BASE}${path}`, { ...init, signal: controller.signal });
    return await unwrap<T>(response);
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (timedOut) throw new ApiError(TOO_SLOW, 0);
    if (signal?.aborted && isAbort(cause)) throw cause;
    throw new ApiError(UNREACHABLE, 0);
  } finally {
    clearTimeout(deadline);
    clearTimeout(slow);
    signal?.removeEventListener('abort', forward);
  }
}

function post<T>(path: string, body: unknown, options?: RequestOptions): Promise<T> {
  return request<T>(
    path,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    options,
  );
}

function get<T>(path: string, signal: AbortSignal): Promise<T> {
  return request<T>(path, {}, {}, signal);
}

async function unwrap<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed (${response.status}).`;
    throw new ApiError(message, response.status);
  }
  // A page that is not JSON, such as a platform's holding page, would otherwise arrive as an
  // empty answer that every caller would have to remember to check for.
  if (payload === null) throw new ApiError(UNREADABLE, response.status);
  return payload as T;
}

export function analyze(input: AnalyzeInput, options?: RequestOptions): Promise<AnalyzeResponse> {
  return post<AnalyzeResponse>(
    '/analyze',
    {
      label: input.label,
      skinType: input.skinType,
      sunExposure: input.sunExposure,
      declaredAllergies: input.declaredAllergies,
    },
    options,
  );
}

/**
 * Autocomplete for manual entry. The corpus is 7,729 rows and the server scans the
 * matcher's own key space, so anything findable here is matchable by the analyser — a
 * name picked from this list cannot come back unrecognised.
 */
export function searchIngredients(
  query: string,
  limit: number,
  signal: AbortSignal,
): Promise<IngredientSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  return get<IngredientSearchResponse>(`/ingredients?${params.toString()}`, signal);
}

export const NO_CAPABILITIES: Capabilities = { remoteOcr: null, modelNotes: null };

/** Which model-assisted features the server has keys for. Anything unreachable reads as none. */
export async function getCapabilities(signal: AbortSignal): Promise<Capabilities> {
  try {
    return await get<Capabilities>('/capabilities', signal);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    return NO_CAPABILITIES;
  }
}

/** Sends a photograph to the server's remote OCR model. The caller has told the user so. */
export function readLabelRemotely(imageDataUrl: string): Promise<OcrResponse> {
  return post<OcrResponse>('/ocr', { image: imageDataUrl });
}

/** Model notes on names the reference data could not identify. Advisory, never scored. */
export function describeUnrecognised(names: string[]): Promise<NotesResponse> {
  return post<NotesResponse>('/notes', { names });
}

/**
 * Starts the API if it is asleep, without waiting for it. A visitor spends about as long
 * reading the page as the wake takes, so by the time they press a button it has usually
 * finished. `no-cors` is enough: only the arrival of the request matters, the answer is
 * never read, and the request carries nothing.
 */
export function wakeApi(): void {
  fetch(`${BASE}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
}
