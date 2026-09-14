import { z } from 'zod';
import type { MatchingContext } from '../matching/context';

export type HttpError = Error & { statusCode: number };

function httpError(statusCode: number, message: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
}

/** The error handler passes a sub-500 message straight to the client, so both stay caller-facing. */
export function badRequest(message: string): HttpError {
  return httpError(400, message);
}

export function notFound(message: string): HttpError {
  return httpError(404, message);
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    )
    .join('; ');
}

/**
 * Validation failures are told to the caller rather than logged and swallowed — a request
 * rejected for an unstated reason is indistinguishable from a broken API.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, payload: unknown): z.infer<S> {
  const parsed = schema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw badRequest(formatIssues(parsed.error));
}

export type LoadContext = () => Promise<MatchingContext>;

/**
 * Resolved on first request, never at registration. `db/client` opens a connection and
 * throws without `DATABASE_URL`, so importing it at boot would make `buildServer`
 * unconstructible in tests and in CI, neither of which has a database.
 */
export const loadContextLazily: LoadContext = async () => {
  const { loadMatchingContext } = await import('../matching/context');
  return loadMatchingContext();
};
