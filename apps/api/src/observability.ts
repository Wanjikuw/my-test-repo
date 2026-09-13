import * as Sentry from '@sentry/node';

/**
 * Error reporting, off unless a DSN is configured.
 *
 * Without this, an unhandled exception on Fly is written to stdout and lost the next time
 * the machine stops — which, with auto-stop enabled, is minutes later. The DSN gates it so
 * local development and tests stay silent and network-free.
 */
let enabled = false;

export interface ObservabilityEnv {
  SENTRY_DSN?: string | undefined;
  SENTRY_ENVIRONMENT?: string | undefined;
  NODE_ENV?: string | undefined;
}

export function initObservability(env: ObservabilityEnv = process.env): boolean {
  if (!env.SENTRY_DSN) {
    enabled = false;
    return false;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV ?? 'development',
    // Tracing is a separate cost and a separate decision; this is error reporting only.
    tracesSampleRate: 0,
  });

  enabled = true;
  return true;
}

export function isObservabilityEnabled(): boolean {
  return enabled;
}

/**
 * Reports a server-side failure. Client errors are deliberately not sent: a 400 describes
 * the caller's input, and reporting those would bury real defects in noise.
 */
export function captureServerError(error: unknown, context: Record<string, unknown>): void {
  if (!enabled) return;
  Sentry.captureException(error, { extra: context });
}
