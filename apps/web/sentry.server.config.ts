import * as Sentry from '@sentry/nextjs';

// Same public DSN as the client config — Sentry DSNs identify a project and are safe to
// share across runtimes, unlike SENTRY_AUTH_TOKEN which stays server/build-only.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
});
