import type { Reservation, ReservationStatus } from "./types";

/**
 * Statusi koji blokiraju stol za termin.
 * "cancelled" i "no_show" oslobađaju stol.
 */
export const ACTIVE_RESERVATION_STATUSES: readonly ReservationStatus[] = [
  "held",
  "paid",
  "confirmed",
  "checked_in",
];

export function isActiveReservation(reservation: Pick<Reservation, "status">): boolean {
  return ACTIVE_RESERVATION_STATUSES.includes(reservation.status);
}

/** Ključ jedinstvenosti aktivne rezervacije: (stol, event). */
export function tableEventKey(reservation: Pick<Reservation, "tableId" | "eventId">): string {
  return `${reservation.tableId}::${reservation.eventId}`;
}

/** Vraća ID-eve rezervacija koje krše pravilo "najviše jedna aktivna po (stol, event)". */
export function findDoubleBookings(reservations: readonly Reservation[]): string[] {
  const seen = new Set<string>();
  const conflicts: string[] = [];
  for (const reservation of reservations) {
    if (!isActiveReservation(reservation)) continue;
    const key = tableEventKey(reservation);
    if (seen.has(key)) conflicts.push(reservation.id);
    else seen.add(key);
  }
  return conflicts;
}
