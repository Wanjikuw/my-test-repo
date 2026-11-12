'use client';

import { useEffect, useRef, useState } from 'react';
import { hasSessionCookie } from '../lib/auth/session-hint';
import { useProfile } from '../lib/profile';
import { link, push, reconcile, unlink, type ProfileDb, type SyncStore } from '../lib/profile-sync';

type Status = 'hidden' | 'checking' | 'off' | 'on' | 'busy' | 'error';

const SAVE_DELAY_MS = 800;

/** The zustand store seen through the small interface the sync logic needs. */
const store: SyncStore = {
  get() {
    const { skinType, sensitivityIssues, sunExposure, declaredAllergies, syncedAt, dirty } =
      useProfile.getState();
    return {
      data: { skinType, sensitivityIssues, sunExposure, declaredAllergies },
      syncedAt,
      dirty,
    };
  },
  // `setState` rather than the setters, which would mark the change as made on this device.
  set(patch) {
    const { data, ...rest } = patch;
    useProfile.setState({ ...data, ...rest });
  },
};

/**
 * Keeps the profile in the signed-in person's account, but only once they have asked for that.
 *
 * Nothing is loaded for a visitor with no session cookie. The account copy is read once when the
 * page opens, and later edits are saved a moment after the last keystroke, so typing an allergy
 * is one request rather than one per letter.
 */
export function ProfileSync() {
  const [status, setStatus] = useState<Status>('hidden');
  const db = useRef<ProfileDb | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const linked = useRef(false);

  async function run(work: () => Promise<Status | void>) {
    setStatus('busy');
    try {
      const next = await work();
      setStatus(next ?? (linked.current ? 'on' : 'off'));
    } catch {
      setStatus('error');
    }
  }

  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) return;
    let cancelled = false;
    setStatus('checking');

    (async () => {
      try {
        const { getBrowserClient } = await import('../lib/supabase/client');
        const { data } = await getBrowserClient().auth.getSession();
        const user = data.session?.user;
        if (!user || cancelled) return setStatus('hidden');
        const { supabaseProfileDb } = await import('../lib/profile-db');
        db.current = supabaseProfileDb(user.id);
        const outcome = await reconcile(db.current, store);
        if (cancelled) return;
        linked.current = outcome === 'on';
        setStatus(outcome);
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    const stop = useProfile.subscribe((state) => {
      if (!linked.current || !state.dirty) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const current = db.current;
        if (!current) return;
        push(current, store).then(
          () => setStatus('on'),
          () => setStatus('error'),
        );
      }, SAVE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      stop();
    };
  }, []);

  if (status === 'hidden') return null;

  return (
    <div className="rounded-md border border-line bg-surface p-4 text-sm leading-relaxed">
      <p className="text-xs font-medium tracking-widest text-muted uppercase">Your account</p>

      {status === 'checking' && <p className="mt-2 text-muted">Looking for a saved profile…</p>}

      {status === 'off' && (
        <>
          <p className="mt-2 text-muted">
            This profile is only on this device. Save it to your account to have it on any device
            you sign in on. Nothing is saved to your account unless you ask.
          </p>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                if (!db.current) throw new Error('not ready');
                await link(db.current, store);
                linked.current = true;
                return 'on';
              })
            }
            className="mt-3 rounded-md border border-line px-4 py-2 hover:border-muted"
          >
            Save to my account
          </button>
        </>
      )}

      {status === 'on' && (
        <>
          <p role="status" className="mt-2 text-muted">
            Saved to your account. Changes are saved as you make them.
          </p>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                if (!db.current) throw new Error('not ready');
                await unlink(db.current, store);
                linked.current = false;
                return 'off';
              })
            }
            className="mt-3 text-muted underline underline-offset-4 hover:text-ink"
          >
            Remove from my account
          </button>
        </>
      )}

      {status === 'busy' && (
        <p role="status" className="mt-2 text-muted">
          Working…
        </p>
      )}

      {status === 'error' && (
        <>
          <p role="alert" className="mt-2 text-avoid">
            Your account could not be reached. Your profile is still kept on this device.
          </p>
          <button
            type="button"
            onClick={() =>
              run(async () => {
                if (!db.current) throw new Error('not ready');
                const outcome = await reconcile(db.current, store);
                linked.current = outcome === 'on';
                return outcome;
              })
            }
            className="mt-3 rounded-md border border-line px-4 py-2 hover:border-muted"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
