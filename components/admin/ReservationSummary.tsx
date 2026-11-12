import type { Reservation } from "@/lib/domain/types";
import { formatEur, formatReservationCode } from "@/lib/format";
import { messages } from "@/lib/i18n";
import { DetailRows } from "../reservation/DetailRows";

const t = messages.admin;

/** Podaci rezervacije za osoblje (uključuje mobitel gosta). */
export function StaffReservationDetails({ reservation }: { reservation: Reservation }) {
  return (
    <DetailRows
      rows={[
        { label: messages.reservation.guest, value: reservation.guestName ?? "—" },
        ...(reservation.guestPhone
          ? [
              {
                label: messages.booking.guestPhone,
                value: (
                  <a href={`tel:${reservation.guestPhone}`} className="underline">
                    {reservation.guestPhone}
                  </a>
                ),
              },
            ]
          : []),
        { label: messages.reservation.partySize, value: reservation.partySize },
        { label: messages.tableSheet.status, value: `${t.status[reservation.status]} · ${t.source[reservation.source]}` },
        { label: messages.reservation.code, value: <span className="font-mono">{formatReservationCode(reservation.code)}</span> },
        { label: messages.reservation.deposit, value: formatEur(reservation.depositCents) },
      ]}
    />
  );
}
