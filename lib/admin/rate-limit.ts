export interface RateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

/** Ograničenje pogrešnih pokušaja po ključu (pravilo 2: 5 u 10 minuta). */
export function createRateLimiter(options: { max: number; windowMs: number } = { max: 5, windowMs: 10 * 60_000 }) {
  const failures = new Map<string, number[]>();

  const recent = (key: string, now: Date): number[] => {
    const since = now.getTime() - options.windowMs;
    const list = (failures.get(key) ?? []).filter((time) => time > since);
    failures.set(key, list);
    return list;
  };

  return {
    check(key: string, now: Date): RateLimitDecision {
      const list = recent(key, now);
      if (list.length < options.max) return { allowed: true, retryAfterMs: 0 };
      const oldest = list[0] ?? now.getTime();
      return { allowed: false, retryAfterMs: oldest + options.windowMs - now.getTime() };
    },
    recordFailure(key: string, now: Date): void {
      recent(key, now).push(now.getTime());
    },
    reset(key: string): void {
      failures.delete(key);
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
