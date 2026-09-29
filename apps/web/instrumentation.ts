import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Requires @sentry/nextjs >= 8.28.0; captures unhandled server-side request errors.
export const onRequestError = Sentry.captureRequestError;
