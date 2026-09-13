import { describe, it, expect } from 'vitest';
import { resolvePostgresOptions, usesTransactionPooler } from './pooler';

const SESSION = 'postgresql://postgres.ref:pw@aws-0-eu-west-2.pooler.supabase.com:5432/postgres';
const TRANSACTION =
  'postgresql://postgres.ref:pw@aws-0-eu-west-2.pooler.supabase.com:6543/postgres';

describe('usesTransactionPooler', () => {
  it('recognises the transaction pooler by its port', () => {
    expect(usesTransactionPooler(TRANSACTION)).toBe(true);
  });

  it('treats the session pooler as ordinary', () => {
    expect(usesTransactionPooler(SESSION)).toBe(false);
  });

  it('assumes the safer session pooler for an unparseable url', () => {
    expect(usesTransactionPooler('not-a-url')).toBe(false);
  });
});

describe('resolvePostgresOptions', () => {
  // Prepared statements break silently and intermittently on the transaction pooler,
  // so the mode has to follow the URL rather than a developer remembering.
  it('disables prepared statements on the transaction pooler', () => {
    expect(resolvePostgresOptions(TRANSACTION, {}).prepare).toBe(false);
  });

  it('keeps prepared statements on the session pooler', () => {
    expect(resolvePostgresOptions(SESSION, {}).prepare).toBe(true);
  });

  it('defaults to a small pool', () => {
    expect(resolvePostgresOptions(SESSION, {}).max).toBe(5);
  });

  it('honours an explicit pool size', () => {
    expect(resolvePostgresOptions(SESSION, { DATABASE_POOL_MAX: '3' }).max).toBe(3);
  });

  it('ignores a nonsensical pool size rather than opening zero connections', () => {
    expect(resolvePostgresOptions(SESSION, { DATABASE_POOL_MAX: '0' }).max).toBe(5);
    expect(resolvePostgresOptions(SESSION, { DATABASE_POOL_MAX: 'many' }).max).toBe(5);
  });

  it('sets timeouts so idle connections release their pooler slot', () => {
    const options = resolvePostgresOptions(SESSION, {});
    expect(options.idle_timeout).toBeGreaterThan(0);
    expect(options.connect_timeout).toBeGreaterThan(0);
  });
});
