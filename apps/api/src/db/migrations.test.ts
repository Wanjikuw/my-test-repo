import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DRIZZLE_DIR = join(__dirname, '../../drizzle');

function migrationFiles(): { name: string; sql: string }[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(DRIZZLE_DIR, name), 'utf-8') }));
}

describe('generated migrations', () => {
  it('gives every enum column change an explicit USING clause', () => {
    // drizzle-kit emits a bare `SET DATA TYPE`, which Postgres rejects for a cast to an
    // enum (42804). Nothing catches it until the migration is run against a real database,
    // so the USING clause has to be added by hand and this asserts nobody forgets.
    const files = migrationFiles();

    const enumTypes = new Set<string>();
    for (const { sql } of files) {
      for (const m of sql.matchAll(/CREATE TYPE "[^"]+"\."([^"]+)" AS ENUM/gi)) {
        if (m[1]) enumTypes.add(m[1]);
      }
    }
    expect(enumTypes.size).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const { name, sql } of files) {
      for (const line of sql.split('\n')) {
        if (!/SET DATA TYPE/i.test(line) || /USING/i.test(line)) continue;
        const target = line.match(/SET DATA TYPE "?([A-Za-z_][A-Za-z0-9_]*)"?/);
        if (target?.[1] && enumTypes.has(target[1])) {
          offenders.push(`${name}: ${line.trim().slice(0, 90)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the manual RLS policies out of the generated sequence', () => {
    // drizzle-kit does not manage policies; a file it can sequence would collide with them.
    expect(migrationFiles().some((f) => f.sql.includes('create policy'))).toBe(false);
  });
});
