/**
 * Every call the browser makes to the API.
 *
 * `NEXT_PUBLIC_API_URL` is read at module scope so a missing value fails on the first
 * request with a sentence about configuration, rather than as a fetch to `undefined/analyze`.
 */
import type { AnalyzeResponse, SkinType, SunExposure } from '@allergy-checker/shared';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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
