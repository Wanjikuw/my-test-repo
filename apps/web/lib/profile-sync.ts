import { SensitivityIssue, SkinType, SunExposure } from '@allergy-checker/shared';

export interface ProfileData {
  skinType: SkinType | null;
  sensitivityIssues: SensitivityIssue[];
  sunExposure: SunExposure | null;
  declaredAllergies: string[];
}

/** The shape of a `user_profiles` row, which is what the service sends back. */
export interface ProfileRow {
  skin_type: string | null;
  sensitivity_issues: string[];
  sun_exposure: string | null;
  declared_allergies: string[];
  updated_at: string;
}

export const MAX_ALLERGIES = 50;
export const MAX_ALLERGY_CHARS = 100;

export const EMPTY_PROFILE: ProfileData = {
  skinType: null,
  sensitivityIssues: [],
  sunExposure: null,
  declaredAllergies: [],
};

export function hasProfileData(profile: ProfileData): boolean {
  return (
    profile.skinType !== null ||
    profile.sunExposure !== null ||
    profile.sensitivityIssues.length > 0 ||
    profile.declaredAllergies.length > 0
  );
}

/** Same allergy, however it was capitalised or spaced. */
const allergyKey = (name: string) => name.trim().toLowerCase();

function cleanAllergies(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const name = value.trim().slice(0, MAX_ALLERGY_CHARS);
    const key = allergyKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length === MAX_ALLERGIES) break;
  }
  return out;
}

function cleanIssues(values: readonly unknown[]): SensitivityIssue[] {
  const present = new Set(values);
  return SensitivityIssue.options.filter((issue) => present.has(issue));
}

/** Whatever came back, reduced to values the app understands. A row someone edited by hand cannot inject anything. */
export function rowToProfile(row: unknown): { data: ProfileData; updatedAt: string } | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Partial<Record<keyof ProfileRow, unknown>>;
  if (typeof r.updated_at !== 'string') return null;
  const skinType = SkinType.safeParse(r.skin_type);
  const sun = SunExposure.safeParse(r.sun_exposure);
  return {
    updatedAt: r.updated_at,
    data: {
      skinType: skinType.success ? skinType.data : null,
      sensitivityIssues: cleanIssues(
        Array.isArray(r.sensitivity_issues) ? r.sensitivity_issues : [],
      ),
      sunExposure: sun.success ? sun.data : null,
      declaredAllergies: cleanAllergies(
        Array.isArray(r.declared_allergies) ? r.declared_allergies : [],
      ),
    },
  };
}

export function profileToRow(profile: ProfileData): Omit<ProfileRow, 'updated_at'> {
  return {
    skin_type: profile.skinType,
    sensitivity_issues: cleanIssues(profile.sensitivityIssues),
    sun_exposure: profile.sunExposure,
    declared_allergies: cleanAllergies(profile.declaredAllergies),
  };
}

export function sameProfile(a: ProfileData, b: ProfileData): boolean {
  return (
    a.skinType === b.skinType &&
    a.sunExposure === b.sunExposure &&
    a.sensitivityIssues.join() === b.sensitivityIssues.join() &&
    a.declaredAllergies.join('\n') === b.declaredAllergies.join('\n')
  );
}

/**
 * Two copies edited apart. What this device says wins where it says anything, and the lists are
 * joined. An allergy that comes back after being removed elsewhere is the safe error: a label is
 * checked against one name too many, never one too few.
 */
export function mergeProfiles(mine: ProfileData, theirs: ProfileData): ProfileData {
  return {
    skinType: mine.skinType ?? theirs.skinType,
    sunExposure: mine.sunExposure ?? theirs.sunExposure,
    sensitivityIssues: cleanIssues([...mine.sensitivityIssues, ...theirs.sensitivityIssues]),
    declaredAllergies: cleanAllergies([...mine.declaredAllergies, ...theirs.declaredAllergies]),
  };
}

export interface LocalSyncState {
  data: ProfileData;
  /** The `updated_at` of the account copy this device last agreed with. Null: never linked. */
  syncedAt: string | null;
  /** Edited here since then. */
  dirty: boolean;
}

export interface ProfileDb {
  load(): Promise<{ data: ProfileData; updatedAt: string } | null>;
  save(data: ProfileData): Promise<string>;
  remove(): Promise<void>;
}

export interface SyncStore {
  get(): LocalSyncState;
  set(patch: Partial<LocalSyncState>): void;
}

export type SyncStatus = 'on' | 'off';

/**
 * Brings this device and the account together, once, when the page opens.
 *
 * No account copy means the person has not opted in (or removed it), so nothing is uploaded.
 * `updated_at` is compared as the exact text the service sent, never parsed, so a phone's clock
 * and the service's rounding cannot make two equal copies look different.
 */
export async function reconcile(db: ProfileDb, store: SyncStore): Promise<SyncStatus> {
  const remote = await db.load();
  const local = store.get();

  if (!remote) {
    if (local.syncedAt !== null) store.set({ syncedAt: null });
    return 'off';
  }

  if (local.syncedAt === remote.updatedAt) {
    if (local.dirty) await push(db, store);
    return 'on';
  }

  if (local.syncedAt !== null && !local.dirty) {
    store.set({ data: remote.data, syncedAt: remote.updatedAt, dirty: false });
    return 'on';
  }

  const merged = mergeProfiles(local.data, remote.data);
  store.set({ data: merged, syncedAt: remote.updatedAt, dirty: !sameProfile(merged, remote.data) });
  if (store.get().dirty) await push(db, store);
  return 'on';
}

/** Saves what is on this device. An edit made while the request was in flight stays marked unsaved. */
export async function push(db: ProfileDb, store: SyncStore): Promise<void> {
  const sent = store.get().data;
  const updatedAt = await db.save(sent);
  const now = store.get();
  store.set({ syncedAt: updatedAt, dirty: !sameProfile(now.data, sent) });
}

/** The person chose "Save to my account". */
export async function link(db: ProfileDb, store: SyncStore): Promise<void> {
  await push(db, store);
}

/** The person chose to remove it. This device keeps its own copy. */
export async function unlink(db: ProfileDb, store: SyncStore): Promise<void> {
  await db.remove();
  store.set({ syncedAt: null, dirty: true });
}
