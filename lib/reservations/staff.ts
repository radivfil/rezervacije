import { z } from "zod";
import { IdSchema, IsoDateSchema } from "../domain/schemas";
import type { Event, Reservation, Table, Zone } from "../domain/types";
import { calculateTablePrice } from "../pricing";
import { normalizePhone } from "./phone";
import { checkBookable, fail, isHoldExpired, ok, type HoldError, type Result } from "./rules";

const HOUR = 3_600_000;
/** Check-in je dopušten od 3 h prije do 8 h nakon početka termina (pravilo 5). */
export const CHECK_IN_BEFORE_MS = 3 * HOUR;
export const CHECK_IN_AFTER_MS = 8 * HOUR;

const isPaid = (reservation: Reservation): boolean =>
  reservation.status === "paid" || reservation.status === "confirmed";

export type CheckInError = "already_checked_in" | "not_confirmed" | "outside_window";

/** Pravilo 5. */
export function checkIn(reservation: Reservation, event: Pick<Event, "startsAt">, now: Date): Result<Reservation, CheckInError> {
  if (reservation.status === "checked_in") return fail("already_checked_in");
  if (!isPaid(reservation)) return fail("not_confirmed");
  const start = Date.parse(event.startsAt);
  if (now.getTime() < start - CHECK_IN_BEFORE_MS || now.getTime() > start + CHECK_IN_AFTER_MS) return fail("outside_window");
  return ok({ ...reservation, status: "checked_in", checkedInAt: now.toISOString() });
}

export type NoShowError = "not_confirmed" | "too_early";

/** Pravilo 6: samo nakon početka termina; stol postaje slobodan. */
export function markNoShow(reservation: Reservation, event: Pick<Event, "startsAt">, now: Date): Result<Reservation, NoShowError> {
  if (!isPaid(reservation)) return fail("not_confirmed");
  if (now.getTime() < Date.parse(event.startsAt)) return fail("too_early");
  return ok({ ...reservation, status: "no_show", noShowAt: now.toISOString() });
}

/** Pravilo 7: held (neistekao), paid ili confirmed, prije check-ina. */
export function staffCancel(reservation: Reservation, now: Date): Result<Reservation, "not_cancellable"> {
  const cancellable = (reservation.status === "held" && !isHoldExpired(reservation, now)) || isPaid(reservation);
  if (!cancellable) return fail("not_cancellable");
  const updated: Reservation = { ...reservation, status: "cancelled", cancelledAt: now.toISOString(), cancelReason: "staff" };
  delete updated.holdExpiresAt;
  return ok(updated);
}

export interface StaffActions {
  checkIn: boolean;
  noShow: boolean;
  cancel: boolean;
}

/** Koje akcije osoblje trenutno smije (za prikaz gumba; pravila se ponovno provjeravaju pri akciji). */
export function allowedStaffActions(reservation: Reservation, event: Pick<Event, "startsAt">, now: Date): StaffActions {
  return {
    checkIn: checkIn(reservation, event, now).ok,
    noShow: markNoShow(reservation, event, now).ok,
    cancel: staffCancel(reservation, now).ok,
  };
}

export const StaffReservationKindSchema = z.enum(["confirmed", "hold"]);
export type StaffReservationKind = z.infer<typeof StaffReservationKindSchema>;

/** Ulaz osoblja za ručnu rezervaciju (pravilo 8). Mobitel je opcionalan. */
export const StaffReservationRequestSchema = z.object({
  tableId: IdSchema,
  date: IsoDateSchema,
  kind: StaffReservationKindSchema,
  partySize: z.coerce.number().int("partySize").min(1, "partySize"),
  guestName: z.string().trim().min(2, "guestName").max(60, "guestName"),
  guestPhone: z.string().transform((value, ctx) => {
    if (value.trim() === "") return undefined;
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "guestPhone" });
      return z.NEVER;
    }
    return normalized;
  }),
});

export type StaffReservationRequest = z.infer<typeof StaffReservationRequestSchema>;

/** Pravilo 8: ručna rezervacija osoblja, ista pravila kao za gosta. */
export function createStaffReservation(input: {
  id: string;
  code: string;
  request: StaffReservationRequest;
  table: Table;
  zone: Zone;
  event: Event;
  existing: readonly Reservation[];
  now: Date;
}): Result<Reservation, HoldError> {
  const { request, table, zone, event, existing, now } = input;
  const blocked = checkBookable({ table, event, partySize: request.partySize, existing, now });
  if (blocked) return fail(blocked);
  const price = calculateTablePrice(zone, event);
  const timestamp = now.toISOString();
  const base: Reservation = {
    id: input.id,
    venueId: table.venueId,
    eventId: event.id,
    tableId: table.id,
    code: input.code,
    status: request.kind === "confirmed" ? "confirmed" : "held",
    partySize: request.partySize,
    guestName: request.guestName,
    minSpendCents: price.minSpendCents,
    depositCents: price.depositCents,
    createdAt: timestamp,
    source: "staff",
  };
  if (request.guestPhone) base.guestPhone = request.guestPhone;
  if (request.kind === "confirmed") {
    base.paidAt = timestamp;
    base.confirmedAt = timestamp;
  } else {
    base.holdExpiresAt = event.startsAt;
  }
  return ok(base);
}
