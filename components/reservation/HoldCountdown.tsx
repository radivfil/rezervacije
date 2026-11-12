"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { formatCountdown } from "@/lib/format";
import { messages } from "@/lib/i18n";

function subscribe(onTick: () => void): () => void {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

/** Trenutna sekunda; na serveru null (izbjegava razliku pri hidrataciji). */
function useNowSeconds(): number | null {
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null,
  );
}

export function HoldCountdown({ expiresAt, totalMinutes }: { expiresAt: string; totalMinutes: number }) {
  const router = useRouter();
  const nowSeconds = useNowSeconds();
  const remaining = nowSeconds === null ? null : Date.parse(expiresAt) - nowSeconds * 1000;
  const expired = remaining !== null && remaining <= 0;
  const progress = remaining === null ? 1 : Math.max(0, Math.min(1, remaining / (totalMinutes * 60_000)));

  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  return (
    <div className="flex flex-col gap-2" role="timer" aria-live="off">
      <div className="flex items-baseline justify-between">
        <span className="text-sm opacity-70">{messages.reservation.timeLeft}</span>
        <span className="font-mono text-3xl font-semibold tabular-nums">
          {remaining === null ? "–:––" : formatCountdown(remaining)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-brand-background">
        <div className="h-full rounded-full bg-brand-primary transition-[width] duration-1000" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
