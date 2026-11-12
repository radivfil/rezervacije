import Link from "next/link";
import { messages } from "@/lib/i18n";
import { reservationHref } from "@/lib/routes";
import type { StaffReservationRow } from "@/lib/services/staff";

const STATUS_CLASS: Record<string, string> = {
  held: "bg-yellow-500/20",
  paid: "bg-red-500/20",
  confirmed: "bg-red-500/20",
  checked_in: "bg-green-500/25",
  no_show: "bg-brand-text/10",
};

export function ReservationList({ slug, rows }: { slug: string; rows: readonly StaffReservationRow[] }) {
  const t = messages.admin;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.listTitle}</h2>
      {rows.length === 0 ? <p className="opacity-70">{t.listEmpty}</p> : null}
      <ul className="flex flex-col divide-y divide-brand-text/10 rounded-2xl bg-brand-surface">
        {rows.map(({ reservation, table, zone }) => (
          <li key={reservation.id}>
            <Link
              href={reservationHref(slug, reservation.code)}
              className="flex min-h-14 items-center gap-3 px-4 py-2"
            >
              <span className="w-12 font-mono font-semibold">{table.label}</span>
              <span className="flex flex-1 flex-col">
                <span className="font-medium">{reservation.guestName ?? t.source[reservation.source]}</span>
                <span className="text-xs opacity-70">
                  {zone.name} · {reservation.partySize} {messages.reservation.partySize.toLowerCase()}
                </span>
              </span>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASS[reservation.status] ?? ""}`}>
                {t.status[reservation.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
