import { defineConfig } from 'vitest/config';

// Tests must not depend on the machine they run on. dotenv never overrides a variable that is
// already defined, so blanking these keeps a developer's .env out of the run, and a module that
// needs a database at import time fails here exactly as it does on CI. The sign-in variables are
// blanked for the same reason: with AUTH_REQUIRED set in someone's shell, every route test would
// be answered with a 401.
export default defineConfig({
  test: {
    // The first test in each worker builds a server, which loads every plugin. Beside a build on a
    // busy or slow machine that has taken longer than the default five seconds, with nothing wrong.
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: '',
      QWEN_API_KEY: '',
      SENTRY_DSN: '',
      ALERT_WEBHOOK_URL: '',
      AUTH_REQUIRED: '',
      SUPABASE_URL: '',
      SUPABASE_JWT_SECRET: '',
    },
  },
});
