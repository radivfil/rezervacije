import type { Reservation, ReservationStatus, Table } from "./types";

/** Status stola za jedan termin, kako ga vidi gost. */
export type TableAvailability = "free" | "held" | "booked";

const AVAILABILITY_BY_STATUS: Readonly<Record<ReservationStatus, TableAvailability>> = {
  held: "held",
  paid: "booked",
  confirmed: "booked",
  checked_in: "booked",
  no_show: "free",
  cancelled: "free",
};

/** Dostupnost svakog stola za zadani termin. Stol bez aktivne rezervacije je slobodan. */
export function computeTableAvailability(
  tables: readonly Pick<Table, "id">[],
  reservations: readonly Pick<Reservation, "tableId" | "eventId" | "status">[],
  eventId: string,
): Record<string, TableAvailability> {
  const result: Record<string, TableAvailability> = {};
  for (const table of tables) result[table.id] = "free";
  for (const reservation of reservations) {
    if (reservation.eventId !== eventId || !(reservation.tableId in result)) continue;
    const availability = AVAILABILITY_BY_STATUS[reservation.status];
    // "booked" ima prednost pred "held", a oba pred "free".
    if (availability === "booked" || (availability === "held" && result[reservation.tableId] === "free")) {
      result[reservation.tableId] = availability;
    }
  }
  return result;
}
