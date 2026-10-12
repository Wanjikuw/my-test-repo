import { defineConfig } from 'vitest/config';

// Tests must not depend on the machine they run on. dotenv never overrides a variable that is
// already defined, so blanking these keeps a developer's .env out of the run, and a module that
// needs a database at import time fails here exactly as it does on CI.
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: '',
      QWEN_API_KEY: '',
      SENTRY_DSN: '',
      ALERT_WEBHOOK_URL: '',
    },
  },
});
