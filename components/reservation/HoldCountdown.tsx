"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { formatCountdown } from "@/lib/format";
import { messages } from "@/lib/i18n";

const URGENT_MS = 120_000;

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
  const urgent = remaining !== null && remaining <= URGENT_MS;
  const progress = remaining === null ? 1 : Math.max(0, Math.min(1, remaining / (totalMinutes * 60_000)));

  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);

  return (
    <div role="timer" aria-live="off">
      <div className="flex items-end justify-between gap-4">
        <span className="eyebrow pb-1.5">{urgent ? messages.reservation.urgent : messages.reservation.timeLeft}</span>
        <span className={`font-mono text-[3.25rem] leading-none font-semibold tabular-nums ${urgent ? "text-booked" : ""}`}>
          {remaining === null ? "–:––" : formatCountdown(remaining)}
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-brand-text/12">
        <div
          className={`h-full origin-left transition-transform duration-1000 ease-linear ${urgent ? "bg-booked" : "bg-brand-primary"}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
