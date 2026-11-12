import { describe, expect, it } from 'vitest';
import {
  EMPTY_PROFILE,
  link,
  mergeProfiles,
  profileToRow,
  push,
  reconcile,
  rowToProfile,
  unlink,
  type LocalSyncState,
  type ProfileData,
  type ProfileDb,
  type SyncStore,
} from './profile-sync';
import { clearSyncedProfile, PROFILE_STORAGE_KEY } from './profile-storage';

const profile = (over: Partial<ProfileData> = {}): ProfileData => ({ ...EMPTY_PROFILE, ...over });

function fakeStore(initial: Partial<LocalSyncState> = {}) {
  let state: LocalSyncState = { data: profile(), syncedAt: null, dirty: false, ...initial };
  const store: SyncStore = {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
    },
  };
  return { store, read: () => state };
}

function fakeDb(remote: { data: ProfileData; updatedAt: string } | null) {
  const calls: string[] = [];
  let version = 0;
  const db: ProfileDb = {
    async load() {
      calls.push('load');
      return remote;
    },
    async save(data) {
      calls.push('save');
      version += 1;
      remote = { data, updatedAt: `2026-11-12T10:00:0${version}+00:00` };
      return remote.updatedAt;
    },
    async remove() {
      calls.push('remove');
      remote = null;
    },
  };
  return { db, calls, remote: () => remote };
}

describe('rowToProfile', () => {
  it('reads a row the service sent', () => {
    expect(
      rowToProfile({
        skin_type: 'dry',
        sensitivity_issues: ['redness', 'stinging'],
        sun_exposure: 'avoided',
        declared_allergies: ['Linalool', ' limonene '],
        updated_at: 'T1',
      }),
    ).toEqual({
      updatedAt: 'T1',
      data: {
        skinType: 'dry',
        sensitivityIssues: ['stinging', 'redness'],
        sunExposure: 'avoided',
        declaredAllergies: ['Linalool', 'limonene'],
      },
    });
  });

  it('drops anything the app does not understand rather than passing it on', () => {
    const read = rowToProfile({
      skin_type: 'scaly',
      sensitivity_issues: ['rash', '<script>', 7],
      sun_exposure: 'always',
      declared_allergies: ['ok', 5, null, '  ', 'OK', 'x'.repeat(500)],
      updated_at: 'T',
    });
    expect(read?.data.skinType).toBeNull();
    expect(read?.data.sunExposure).toBeNull();
    expect(read?.data.sensitivityIssues).toEqual(['rash']);
    expect(read?.data.declaredAllergies).toEqual(['ok', 'x'.repeat(100)]);
  });

  it('caps the allergy list', () => {
    const many = Array.from({ length: 80 }, (_, i) => `a${i}`);
    expect(
      rowToProfile({ declared_allergies: many, updated_at: 'T' })?.data.declaredAllergies,
    ).toHaveLength(50);
  });

  it('refuses what is not a row', () => {
    for (const bad of [null, undefined, 'x', 5, {}, { updated_at: 5 }]) {
      expect(rowToProfile(bad)).toBeNull();
    }
  });
});

describe('profileToRow', () => {
  it('sends only clean values', () => {
    expect(
      profileToRow(profile({ skinType: 'oily', declaredAllergies: ['A', 'a', ' b '] })),
    ).toEqual({
      skin_type: 'oily',
      sensitivity_issues: [],
      sun_exposure: null,
      declared_allergies: ['A', 'b'],
    });
  });
});

describe('mergeProfiles', () => {
  it('keeps what this device says and joins the lists', () => {
    const merged = mergeProfiles(
      profile({ skinType: 'dry', declaredAllergies: ['A'], sensitivityIssues: ['rash'] }),
      profile({
        skinType: 'oily',
        sunExposure: 'expected',
        declaredAllergies: ['a', 'B'],
        sensitivityIssues: ['stinging'],
      }),
    );
    expect(merged).toEqual({
      skinType: 'dry',
      sunExposure: 'expected',
      declaredAllergies: ['A', 'B'],
      sensitivityIssues: ['stinging', 'rash'],
    });
  });

  it('fills a blank skin type from the other copy', () => {
    expect(mergeProfiles(profile(), profile({ skinType: 'normal' })).skinType).toBe('normal');
  });
});

describe('reconcile', () => {
  it('uploads nothing when there is no account copy, so nobody is opted in by signing in', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'dry' }), dirty: true });
    const { db, calls } = fakeDb(null);

    expect(await reconcile(db, store)).toBe('off');
    expect(calls).toEqual(['load']);
    expect(read().data.skinType).toBe('dry');
  });

  it('forgets the link when the account copy was removed elsewhere', async () => {
    const { store, read } = fakeStore({ syncedAt: 'T1' });
    const { db } = fakeDb(null);

    expect(await reconcile(db, store)).toBe('off');
    expect(read().syncedAt).toBeNull();
  });

  it('brings a new device up to date from the account', async () => {
    const { store, read } = fakeStore();
    const { db, calls } = fakeDb({ data: profile({ skinType: 'oily' }), updatedAt: 'T1' });

    expect(await reconcile(db, store)).toBe('on');
    expect(read()).toEqual({ data: profile({ skinType: 'oily' }), syncedAt: 'T1', dirty: false });
    expect(calls).toEqual(['load']);
  });

  it('merges a new device’s own entries with the account and saves the result', async () => {
    const { store, read } = fakeStore({
      data: profile({ declaredAllergies: ['Nickel'], sunExposure: 'avoided' }),
      dirty: true,
    });
    const { db, remote } = fakeDb({
      data: profile({ skinType: 'dry', declaredAllergies: ['Linalool'] }),
      updatedAt: 'T1',
    });

    expect(await reconcile(db, store)).toBe('on');
    expect(read().data).toEqual(
      profile({
        skinType: 'dry',
        sunExposure: 'avoided',
        declaredAllergies: ['Nickel', 'Linalool'],
      }),
    );
    expect(read().dirty).toBe(false);
    expect(read().syncedAt).toBe(remote()?.updatedAt);
  });

  it('does nothing when both agree and nothing was edited', async () => {
    const { store } = fakeStore({ syncedAt: 'T1' });
    const { db, calls } = fakeDb({ data: profile(), updatedAt: 'T1' });

    expect(await reconcile(db, store)).toBe('on');
    expect(calls).toEqual(['load']);
  });

  it('saves an edit made while the page was closed', async () => {
    const { store, read } = fakeStore({
      data: profile({ skinType: 'dry' }),
      syncedAt: 'T1',
      dirty: true,
    });
    const { db, calls, remote } = fakeDb({ data: profile(), updatedAt: 'T1' });

    await reconcile(db, store);
    expect(calls).toEqual(['load', 'save']);
    expect(remote()?.data.skinType).toBe('dry');
    expect(read().dirty).toBe(false);
  });

  it('takes the account copy when it changed elsewhere and nothing here was edited', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'dry' }), syncedAt: 'T1' });
    const { db, calls } = fakeDb({ data: profile({ skinType: 'oily' }), updatedAt: 'T2' });

    await reconcile(db, store);
    expect(read().data.skinType).toBe('oily');
    expect(read().syncedAt).toBe('T2');
    expect(calls).toEqual(['load']);
  });

  it('merges when both sides changed', async () => {
    const { store, read } = fakeStore({
      data: profile({ skinType: 'dry', declaredAllergies: ['A'] }),
      syncedAt: 'T1',
      dirty: true,
    });
    const { db, remote } = fakeDb({
      data: profile({ skinType: 'oily', declaredAllergies: ['B'] }),
      updatedAt: 'T2',
    });

    await reconcile(db, store);
    expect(read().data).toEqual(profile({ skinType: 'dry', declaredAllergies: ['A', 'B'] }));
    expect(remote()?.data.declaredAllergies).toEqual(['A', 'B']);
  });

  it('leaves the device alone when the account cannot be read', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'dry' }), dirty: true });
    const db: ProfileDb = {
      load: () => Promise.reject(new Error('offline')),
      save: () => Promise.reject(new Error('offline')),
      remove: () => Promise.reject(new Error('offline')),
    };

    await expect(reconcile(db, store)).rejects.toThrow('offline');
    expect(read().data.skinType).toBe('dry');
    expect(read().dirty).toBe(true);
  });
});

describe('push, link and unlink', () => {
  it('keeps an edit made during the save marked unsaved', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'dry' }), dirty: true });
    const db: ProfileDb = {
      load: async () => null,
      save: async () => {
        store.set({ data: profile({ skinType: 'oily' }), dirty: true });
        return 'T9';
      },
      remove: async () => {},
    };

    await push(db, store);
    expect(read().syncedAt).toBe('T9');
    expect(read().dirty).toBe(true);
  });

  it('links by saving what is here', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'normal' }), dirty: true });
    const { db, remote } = fakeDb(null);

    await link(db, store);
    expect(remote()?.data.skinType).toBe('normal');
    expect(read().dirty).toBe(false);
    expect(read().syncedAt).not.toBeNull();
  });

  it('unlinks by deleting the account copy and keeping the local one', async () => {
    const { store, read } = fakeStore({ data: profile({ skinType: 'normal' }), syncedAt: 'T1' });
    const { db, remote } = fakeDb({ data: profile(), updatedAt: 'T1' });

    await unlink(db, store);
    expect(remote()).toBeNull();
    expect(read().syncedAt).toBeNull();
    expect(read().data.skinType).toBe('normal');
  });
});

describe('clearSyncedProfile', () => {
  const storage = (state: unknown) => {
    const items = new Map<string, string>();
    if (state !== undefined) items.set(PROFILE_STORAGE_KEY, JSON.stringify({ state }));
    return {
      items,
      getItem: (k: string) => items.get(k) ?? null,
      removeItem: (k: string) => void items.delete(k),
    };
  };

  it('forgets a profile the account already holds', () => {
    const s = storage({ syncedAt: 'T1', dirty: false });
    clearSyncedProfile(s);
    expect(s.items.size).toBe(0);
  });

  it('keeps one that has unsaved edits, or was never saved to an account', () => {
    for (const state of [{ syncedAt: 'T1', dirty: true }, { syncedAt: null, dirty: false }, {}]) {
      const s = storage(state);
      clearSyncedProfile(s);
      expect(s.items.size).toBe(1);
    }
  });

  it('survives damaged storage', () => {
    const s = { getItem: () => '{not json', removeItem: () => {} };
    expect(() => clearSyncedProfile(s)).not.toThrow();
    expect(() => clearSyncedProfile(storage(undefined))).not.toThrow();
  });
});
