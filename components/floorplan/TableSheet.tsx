"use client";

import Link from "next/link";
import { AVAILABILITY_COLORS } from "@/lib/floorplan/colors";
import type { TableDetails } from "@/lib/floorplan/table-details";
import { formatEur, formatMultiplier } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { DetailRows } from "../reservation/DetailRows";
import { BottomSheet } from "./BottomSheet";

interface TableSheetProps {
  details: TableDetails;
  /** Poveznica na formu rezervacije; null ako se stol ne može rezervirati. */
  bookHref: string | null;
  onClose: () => void;
}

const t = messages.tableSheet;

export function StatusDot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-3 rounded-full" style={{ backgroundColor: color }} />;
}

/** Panel stola za gosta: cijena, uvjeti i gumb za rezervaciju. */
export function TableSheet({ details, bookHref, onClose }: TableSheetProps) {
  const { price } = details;
  const unavailableMessage = details.bookingClosed ? t.bookingClosed : details.availability !== "free" ? t.notFree : null;

  return (
    <BottomSheet
      title={
        <>
          <StatusDot color={details.zoneColor} />
          {interpolate(t.title, { label: details.label })}
        </>
      }
      closeLabel={t.close}
      onClose={onClose}
      focusKey={details.tableId}
    >
      <DetailRows
        rows={[
          { label: t.zone, value: details.zoneName },
          { label: t.floor, value: details.floorName },
          { label: t.capacity, value: interpolate(t.capacityValue, { count: details.capacity }) },
          {
            label: t.status,
            value: (
              <span className="inline-flex items-center gap-2">
                <StatusDot color={AVAILABILITY_COLORS[details.availability]} />
                {messages.floorplan.status[details.availability]}
              </span>
            ),
          },
          ...(price
            ? [
                { label: t.minSpend, value: formatEur(price.minSpendCents), emphasis: true },
                {
                  label: interpolate(t.deposit, { percent: price.depositPercent }),
                  value: <span className="text-brand-primary">{formatEur(price.depositCents)}</span>,
                  emphasis: true,
                },
                { label: t.remaining, value: formatEur(price.remainingCents) },
              ]
            : []),
        ]}
      />
      {price ? (
        <p className="py-1 text-xs opacity-60">{interpolate(t.multiplier, { multiplier: formatMultiplier(price.multiplier) })}</p>
      ) : (
        <p className="py-2 opacity-70">{t.noPrice}</p>
      )}

      {bookHref ? (
        <Link
          href={bookHref}
          className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-primary px-4 text-base font-semibold text-brand-on-primary active:scale-[0.99]"
        >
          {t.book}
        </Link>
      ) : unavailableMessage ? (
        <p className="mt-3 rounded-xl bg-brand-background/50 p-3 text-center text-sm opacity-80">{unavailableMessage}</p>
      ) : null}

      <div className="mt-3 rounded-xl bg-brand-background/50 p-3 text-sm">
        <h3 className="mb-1 font-semibold">{t.termsTitle}</h3>
        <ul className="list-disc space-y-1 pl-5 opacity-90">
          {price ? (
            <>
              <li>{interpolate(t.termsDeposit, { percent: price.depositPercent })}</li>
              <li>{t.termsDepositCounts}</li>
            </>
          ) : null}
          <li>{interpolate(t.termsCancellation, { hours: details.freeCancellationHours })}</li>
        </ul>
      </div>
    </BottomSheet>
  );
}
