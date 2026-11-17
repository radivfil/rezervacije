"use client";

import Link from "next/link";
import type { TableDetails } from "@/lib/floorplan/table-details";
import { formatEur, formatMultiplier } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { PriceSplit } from "../reservation/PriceSplit";
import { BottomSheet } from "./BottomSheet";
import { StatusGlyph } from "./StatusLegend";

interface TableSheetProps {
  details: TableDetails;
  /** Poveznica na formu rezervacije; null ako se stol ne može rezervirati. */
  bookHref: string | null;
  onClose: () => void;
}

const t = messages.tableSheet;

export function ZoneMark({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: color }} />;
}

/** Panel stola za gosta: cijena, uvjeti i gumb za rezervaciju. */
export function TableSheet({ details, bookHref, onClose }: TableSheetProps) {
  const { price } = details;
  const unavailableMessage = details.bookingClosed ? t.bookingClosed : details.availability !== "free" ? t.notFree : null;

  return (
    <BottomSheet
      eyebrow={
        <>
          <ZoneMark color={details.zoneColor} />
          {details.zoneName} · {details.floorName}
        </>
      }
      title={interpolate(t.title, { label: details.label })}
      closeLabel={t.close}
      onClose={onClose}
      focusKey={details.tableId}
    >
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium text-brand-text">
          <StatusGlyph status={details.availability} />
          {messages.floorplan.status[details.availability]}
        </span>
        <span>{interpolate(t.seats, { count: details.capacity })}</span>
      </p>

      {price ? (
        <div className="mt-4 border-t border-line pt-4">
          <PriceSplit
            minSpendCents={price.minSpendCents}
            depositCents={price.depositCents}
            remainingCents={price.remainingCents}
            note={price.multiplier === 1 ? undefined : interpolate(t.multiplier, { multiplier: formatMultiplier(price.multiplier) })}
          />
        </div>
      ) : (
        <p className="mt-4 text-muted">{t.noPrice}</p>
      )}

      {bookHref && price ? (
        <Link href={bookHref} className="btn btn-primary mt-5 w-full justify-between text-base">
          {interpolate(t.bookAmount, { amount: formatEur(price.depositCents) })}
          <span aria-hidden>→</span>
        </Link>
      ) : unavailableMessage ? (
        <p className="note mt-5">{unavailableMessage}</p>
      ) : null}

      <details className="group mt-3 text-sm">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-muted [&::-webkit-details-marker]:hidden">
          {t.termsTitle}
          <span aria-hidden className="transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <ul className="space-y-1.5 pb-2 text-muted">
          {price ? (
            <>
              <li>{interpolate(t.termsDeposit, { percent: price.depositPercent })}</li>
              <li>{t.termsDepositCounts}</li>
            </>
          ) : null}
          <li>{interpolate(t.termsCancellation, { hours: details.freeCancellationHours })}</li>
        </ul>
      </details>
    </BottomSheet>
  );
}
