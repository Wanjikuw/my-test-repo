import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { resolvePostgresOptions } from './pooler';

// No-ops in deployed environments (Fly injects real env vars and ships no .env file).
config({ path: ['.env', '../../.env'] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set — check your .env against .env.example');
}

const client = postgres(process.env.DATABASE_URL, resolvePostgresOptions(process.env.DATABASE_URL));

export const db = drizzle(client, { schema });
