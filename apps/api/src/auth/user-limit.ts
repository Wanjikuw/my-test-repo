export interface UserLimitSettings {
  max: number;
  windowMs: number;
}

export interface UserLimitVerdict {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * A fixed-window counter per key, held in memory. The per-IP limiter cannot do this job: it
 * runs before sign-in is checked, and one person behind a shared address would use up
 * everyone's budget. Render runs a single instance, so memory is enough; with more than one
 * the budget would be per instance.
 */
export function createUserLimiter(settings: UserLimitSettings, now: () => number = Date.now) {
  const windows = new Map<string, { resetAt: number; count: number }>();

  return function check(key: string): UserLimitVerdict {
    const at = now();

    // Expired windows are dropped as they are met, so the map cannot grow without bound.
    if (windows.size > 10_000) {
      for (const [k, w] of windows) if (w.resetAt <= at) windows.delete(k);
    }

    let entry = windows.get(key);
    if (!entry || entry.resetAt <= at) {
      entry = { resetAt: at + settings.windowMs, count: 0 };
      windows.set(key, entry);
    }
    entry.count += 1;

    return {
      allowed: entry.count <= settings.max,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - at) / 1000)),
    };
  };
}

export function resolveUserLimit(env: NodeJS.ProcessEnv = process.env): UserLimitSettings {
  const configured = Number(env.USER_RATE_LIMIT_MAX);
  return {
    max: Number.isFinite(configured) && configured > 0 ? configured : 60,
    windowMs: 60_000,
  };
}
