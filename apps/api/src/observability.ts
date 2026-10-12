import * as Sentry from '@sentry/node';

/**
 * Error reporting, off unless a Sentry DSN or an alert webhook URL is configured.
 *
 * Without this, an unhandled exception in production is written to stdout and lost the
 * next time the instance stops — which, with idle spin-down, is minutes later. Each channel
 * is gated on its own variable so local development and tests stay silent and
 * network-free.
 */
let enabled = false;
let alerts: AlertState | null = null;

// An outage fails every request; one post per window keeps the channel readable.
export const ALERT_COOLDOWN_MS = 60_000;
const ALERT_TIMEOUT_MS = 5_000;
// Discord rejects messages over 2,000 characters.
const MAX_ALERT_CHARS = 1_900;

export interface ObservabilityEnv {
  SENTRY_DSN?: string | undefined;
  SENTRY_ENVIRONMENT?: string | undefined;
  NODE_ENV?: string | undefined;
  ALERT_WEBHOOK_URL?: string | undefined;
}

export interface AlertWebhook {
  url: string;
  // Slack reads the message from `text`, Discord from `content`.
  field: 'text' | 'content';
}

// A type alias rather than an interface, so it fits Sentry's Record-typed `extra`.
export type ServerErrorContext = {
  requestId: string;
  method: string;
  url: string;
  statusCode: number;
};

interface AlertState {
  webhook: AlertWebhook;
  fetchImpl: typeof fetch;
  lastSentAt: number;
  suppressed: number;
}

export function resolveAlertWebhook(env: ObservabilityEnv = process.env): AlertWebhook | null {
  const raw = env.ALERT_WEBHOOK_URL?.trim();
  if (!raw) return null;

  // The URL is the credential: never send it over plain http, never echo it in an error.
  const url = URL.canParse(raw) ? new URL(raw) : null;
  if (url?.protocol !== 'https:') {
    throw new Error('ALERT_WEBHOOK_URL must be a valid https URL.');
  }

  return { url: url.href, field: url.hostname === 'hooks.slack.com' ? 'text' : 'content' };
}

export function initObservability(
  env: ObservabilityEnv = process.env,
  fetchImpl: typeof fetch = fetch,
): boolean {
  const webhook = resolveAlertWebhook(env);
  alerts = webhook ? { webhook, fetchImpl, lastSentAt: -Infinity, suppressed: 0 } : null;

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

/**
 * Reports a server-side failure. Client errors are deliberately not sent: a 400 describes
 * the caller's input, and reporting those would bury real defects in noise.
 */
export function captureServerError(error: unknown, context: ServerErrorContext): void {
  if (enabled) Sentry.captureException(error, { extra: context });
  if (alerts) postAlert(alerts, error, context);
}

// Fire and forget: a slow or failing webhook must never delay or fail the response.
function postAlert(state: AlertState, error: unknown, context: ServerErrorContext): void {
  const now = Date.now();
  if (now - state.lastSentAt < ALERT_COOLDOWN_MS) {
    state.suppressed += 1;
    return;
  }

  const lines = [
    `allergy-checker-api ${context.statusCode} on ${context.method} ${context.url}`,
    error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    `Request ${context.requestId}; the stack is in the service log under that id.`,
  ];
  if (state.suppressed > 0) lines.push(`${state.suppressed} more since the previous alert.`);
  state.lastSentAt = now;
  state.suppressed = 0;

  const { webhook, fetchImpl } = state;
  void fetchImpl(webhook.url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ [webhook.field]: redact(lines.join('\n')) }),
    signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
  }).then(
    (response) => {
      // Node's fetch holds the connection until the body is read or cancelled.
      void response.body?.cancel();
      if (!response.ok) {
        console.warn(`Alert for request ${context.requestId} refused: HTTP ${response.status}.`);
      }
    },
    (err: unknown) => console.warn(`Alert for request ${context.requestId} not delivered.`, err),
  );
}

// Driver errors can quote a connection string, and a chat channel is no place for one.
function redact(text: string): string {
  const scrubbed = text.replace(/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/]+@/gi, '$1***@');
  return scrubbed.length > MAX_ALERT_CHARS ? `${scrubbed.slice(0, MAX_ALERT_CHARS)}...` : scrubbed;
}
