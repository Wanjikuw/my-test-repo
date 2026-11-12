import { getBrowserClient } from './supabase/client';
import { profileToRow, rowToProfile, type ProfileDb } from './profile-sync';

const TABLE = 'user_profiles';
const COLUMNS = 'skin_type, sensitivity_issues, sun_exposure, declared_allergies, updated_at';

/**
 * The signed-in person's own row. Every call carries their token, so row-level security is the
 * check that it is theirs; the `user_id` filters here only avoid reading or writing more than
 * is needed.
 */
export function supabaseProfileDb(userId: string): ProfileDb {
  const client = () => getBrowserClient();
  return {
    async load() {
      const { data, error } = await client()
        .from(TABLE)
        .select(COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      return data ? rowToProfile(data) : null;
    },
    async save(profile) {
      const { data, error } = await client()
        .from(TABLE)
        .upsert({ user_id: userId, ...profileToRow(profile) }, { onConflict: 'user_id' })
        .select('updated_at')
        .single();
      if (error) throw error;
      return String(data.updated_at);
    },
    async remove() {
      const { error } = await client().from(TABLE).delete().eq('user_id', userId);
      if (error) throw error;
    },
  };
}
