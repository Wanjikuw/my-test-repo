import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Scripts run with cwd=apps/api, but the shared .env lives at the repo root.
// First file to define a key wins, so a local apps/api/.env overrides it.
config({ path: ['.env', '../../.env'] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — copy .env.example to .env at the repo root first');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
