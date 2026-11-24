import { useEffect, useState } from 'react';

/** Supabase lets an address be sent one email a minute, so a button asking for another waits that long. */
export const EMAIL_COOLDOWN_SECONDS = 60;

/**
 * A countdown in whole seconds that stops at zero by itself. Each tick schedules the next, so
 * nothing is left running when the component goes away.
 */
export function useCooldown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1_000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return {
    remaining,
    start: (seconds: number = EMAIL_COOLDOWN_SECONDS) => setRemaining(seconds),
  };
}
