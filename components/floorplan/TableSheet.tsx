"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { AVAILABILITY_COLORS } from "@/lib/floorplan/colors";
import type { TableDetails } from "@/lib/floorplan/table-details";
import { formatEur, formatMultiplier } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";

interface TableSheetProps {
  details: TableDetails;
  /** Poveznica na formu rezervacije; null ako se stol ne može rezervirati. */
  bookHref: string | null;
  onClose: () => void;
}

const t = messages.tableSheet;

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <dt className="opacity-70">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

/** Donji panel s podacima stola. Nije modalan: tlocrt ostaje dostupan za odabir drugog stola. */
export function TableSheet({ details, bookHref, onClose }: TableSheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [details.tableId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const { price } = details;
  const unavailableMessage = details.bookingClosed ? t.bookingClosed : details.availability !== "free" ? t.notFree : null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-h-[60dvh] max-w-3xl overflow-y-auto rounded-t-2xl bg-brand-surface px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] text-brand-text shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
    >
      <div aria-hidden className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-brand-text/30" />
      <header className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="flex items-center gap-2 text-xl font-semibold">
          <span aria-hidden className="inline-block size-3 rounded-full" style={{ backgroundColor: details.zoneColor }} />
          {interpolate(t.title, { label: details.label })}
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t.close}
          className="flex size-11 items-center justify-center rounded-full text-2xl hover:bg-brand-background/40"
        >
          ×
        </button>
      </header>

      <dl className="divide-y divide-brand-text/10">
        <Row label={t.zone}>{details.zoneName}</Row>
        <Row label={t.floor}>{details.floorName}</Row>
        <Row label={t.capacity}>{interpolate(t.capacityValue, { count: details.capacity })}</Row>
        <Row label={t.status}>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block size-3 rounded-full"
              style={{ backgroundColor: AVAILABILITY_COLORS[details.availability] }}
            />
            {messages.floorplan.status[details.availability]}
          </span>
        </Row>
        {price ? (
          <>
            <Row label={t.minSpend}>
              <span className="text-lg">{formatEur(price.minSpendCents)}</span>
            </Row>
            <Row label={interpolate(t.deposit, { percent: price.depositPercent })}>
              <span className="text-lg text-brand-primary">{formatEur(price.depositCents)}</span>
            </Row>
            <Row label={t.remaining}>{formatEur(price.remainingCents)}</Row>
            <p className="py-1 text-xs opacity-60">
              {interpolate(t.multiplier, { multiplier: formatMultiplier(price.multiplier) })}
            </p>
          </>
        ) : (
          <p className="py-2 opacity-70">{t.noPrice}</p>
        )}
      </dl>

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
    </section>
  );
}
