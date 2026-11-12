export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * The project URL and the public key, both of which are meant to be seen by the browser: what
 * the key allows is decided by the database's row-level security, not by keeping it secret.
 * Next inlines `NEXT_PUBLIC_` variables where they are written out in full, which is why the
 * names are not built up from a list. Null means sign-in is not configured for this build.
 */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, anonKey };
}
