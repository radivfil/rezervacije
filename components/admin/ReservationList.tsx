"use client";

import { useState } from "react";
import Link from "next/link";
import { interpolate, messages } from "@/lib/i18n";
import { reservationHref } from "@/lib/routes";
import type { StaffReservationRow } from "@/lib/services/staff";

const STATUS_CLASS: Record<string, string> = {
  held: "border-held/60 text-held",
  paid: "border-line-strong",
  confirmed: "border-line-strong",
  checked_in: "border-free bg-free text-black",
  no_show: "border-booked/60 text-booked",
};

const t = messages.admin;

function matches(row: StaffReservationRow, query: string): boolean {
  if (!query) return true;
  const haystack = [row.reservation.guestName ?? "", row.table.label, row.zone.name, row.reservation.code].join(" ").toLowerCase();
  return haystack.includes(query);
}

/** Popis rezervacija termina s pretragom po imenu, stolu ili kodu. */
export function ReservationList({ slug, rows }: { slug: string; rows: readonly StaffReservationRow[] }) {
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) => matches(row, query.trim().toLowerCase()));
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="display text-[1.375rem]">{t.listTitle}</h2>
        {rows.length > 0 ? (
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t.searchLabel}
            placeholder={t.searchPlaceholder}
            className="field min-h-11 max-w-xs"
          />
        ) : null}
      </div>
      {rows.length === 0 ? <p className="text-muted">{t.listEmpty}</p> : null}
      {rows.length > 0 && visible.length === 0 ? <p className="text-muted">{t.searchEmpty}</p> : null}
      <ul className="divide-y divide-line border-y border-line empty:hidden">
        {visible.map(({ reservation, table, zone }) => (
          <li key={reservation.id}>
            <Link
              href={reservationHref(slug, reservation.code)}
              className="-mx-2 flex min-h-14 items-center gap-3 rounded-ctl px-2 py-2 transition-colors hover:bg-brand-text/5"
            >
              <span className="display w-12 text-lg">{table.label}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{reservation.guestName ?? t.source[reservation.source]}</span>
                <span className="text-xs text-muted">
                  {zone.name} · {interpolate(t.people, { count: reservation.partySize })}
                </span>
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-[0.04em] uppercase ${STATUS_CLASS[reservation.status] ?? "border-line"}`}
              >
                {t.status[reservation.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
