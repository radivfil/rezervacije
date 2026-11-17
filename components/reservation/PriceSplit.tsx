import { formatEur } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";

interface PriceSplitProps {
  minSpendCents: number;
  depositCents: number;
  remainingCents: number;
  /** Akontacija je već plaćena (potvrda), pa se ne nudi kao "sada". */
  paid?: boolean;
  /** Napomena uz iznos (npr. množitelj termina). */
  note?: string;
}

const t = messages.tableSheet;

/** Minimalna potrošnja razlomljena na akontaciju i ostatak u klubu, u stvarnom omjeru. */
export function PriceSplit({ minSpendCents, depositCents, remainingCents, paid = false, note }: PriceSplitProps) {
  const percent = minSpendCents > 0 ? Math.round((depositCents / minSpendCents) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">{t.minSpend}</p>
        {note ? <p className="text-xs text-muted">{note}</p> : null}
      </div>
      <p className="display mt-1 text-[2rem] tabular-nums">{formatEur(minSpendCents)}</p>
      <div
        role="img"
        aria-label={interpolate(t.splitLabel, { percent })}
        className="mt-3 flex h-2 gap-0.5 overflow-hidden rounded-full"
      >
        <span className="bg-brand-primary" style={{ width: `${percent}%` }} />
        <span className="flex-1 bg-brand-text/18" />
      </div>
      <dl className="mt-2 flex justify-between gap-4 text-sm">
        <div>
          <dt className="text-xs text-muted">
            {paid ? messages.reservation.depositPaid : `${t.payNow} · ${percent} %`}
          </dt>
          <dd className="font-semibold tabular-nums">{formatEur(depositCents)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-muted">{t.payAtVenue}</dt>
          <dd className="font-semibold tabular-nums">{formatEur(remainingCents)}</dd>
        </div>
      </dl>
    </div>
  );
}
