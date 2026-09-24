/**
 * Every call the browser makes to the API.
 *
 * `NEXT_PUBLIC_API_URL` is read at module scope so a missing value fails on the first
 * request with a sentence about configuration, rather than as a fetch to `undefined/analyze`.
 */
import type {
  AnalyzeResponse,
  IngredientSearchResponse,
  SkinType,
  SunExposure,
} from '@allergy-checker/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

async function post<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Could not reach the service. Check your connection and try again.', 0);
  }

  return unwrap<T>(response);
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, { signal });
  } catch (cause) {
    // An abort is the caller replacing this request, not a failure to report.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError('Could not reach the service. Check your connection and try again.', 0);
  }

  return unwrap<T>(response);
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
  return payload as T;
}

export function analyze(input: AnalyzeInput): Promise<AnalyzeResponse> {
  return post<AnalyzeResponse>('/analyze', {
    label: input.label,
    skinType: input.skinType,
    sunExposure: input.sunExposure,
    declaredAllergies: input.declaredAllergies,
  });
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
