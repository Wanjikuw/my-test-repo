import type { Options, PostgresType } from 'postgres';

/**
 * Supabase exposes two poolers on different ports and they are not interchangeable.
 *
 * The session pooler (5432) gives a client one backend for the life of the connection,
 * so prepared statements behave normally. The transaction pooler (6543) hands out a
 * different backend per transaction, and a statement prepared on one is invisible to the
 * next. The symptom is an intermittent `prepared statement "s1" does not exist` that only
 * shows up under concurrency, which is a miserable thing to debug.
 *
 * Detected from the port rather than documented in a comment, because switching poolers
 * is a one-character edit to a secret and nobody re-reads the client before making it.
 */
export function usesTransactionPooler(databaseUrl: string): boolean {
  try {
    return new URL(databaseUrl).port === '6543';
  } catch {
    // An unparseable URL will fail loudly at connect time; assume the safer session
    // pooler here rather than silently disabling prepared statements.
    return false;
  }
}

export interface PoolEnv {
  DATABASE_POOL_MAX?: string | undefined;
}

export function resolvePostgresOptions(
  databaseUrl: string,
  env: PoolEnv = process.env,
): Options<Record<string, PostgresType>> {
  const configured = Number(env.DATABASE_POOL_MAX);
  // Every pooled connection holds a Supabase backend slot, and Fly may run more than one
  // machine. A request here is a few short queries, so a small pool is ample; ten per
  // machine was simply more than this workload has ever needed.
  const max = Number.isFinite(configured) && configured > 0 ? configured : 5;

  return {
    max,
    // Auto-stopping machines otherwise leave connections parked; releasing them returns
    // pooler slots to the rest of the fleet.
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: !usesTransactionPooler(databaseUrl),
  };
}
