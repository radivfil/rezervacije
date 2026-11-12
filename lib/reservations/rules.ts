import { z } from "zod";
import { isActiveReservation } from "../domain/reservation-rules";
import { IdSchema, IsoDateSchema } from "../domain/schemas";
import type { Event, PaymentResult, Reservation, Table, VenuePolicy, Zone } from "../domain/types";
import { calculateTablePrice } from "../pricing";
import { normalizePhone } from "./phone";

export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value });
export const fail = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error });

/** Ulaz gosta (forma). Polja s greškom vraćaju se kao ključevi poruka. */
export const ReservationRequestSchema = z.object({
  tableId: IdSchema,
  date: IsoDateSchema,
  partySize: z.coerce.number().int("partySize").min(1, "partySize"),
  guestName: z
    .string()
    .trim()
    .min(2, "guestName")
    .max(60, "guestName"),
  guestPhone: z
    .string()
    .transform((value, ctx) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        ctx.addIssue({ code: "custom", message: "guestPhone" });
        return z.NEVER;
      }
      return normalized;
    }),
});

export type ReservationRequest = z.infer<typeof ReservationRequestSchema>;

/** Je li držanje isteklo u trenutku `now`. */
export function isHoldExpired(reservation: Pick<Reservation, "status" | "holdExpiresAt">, now: Date): boolean {
  return (
    reservation.status === "held" &&
    reservation.holdExpiresAt !== undefined &&
    Date.parse(reservation.holdExpiresAt) <= now.getTime()
  );
}

function releaseHold(reservation: Reservation): Reservation {
  const copy = { ...reservation };
  delete copy.holdExpiresAt;
  return copy;
}

/** Lijeni istek (pravilo 5): istekli held postaje cancelled / hold_expired. */
export function expireHold(reservation: Reservation, now: Date): Reservation {
  if (!isHoldExpired(reservation, now)) return reservation;
  return {
    ...releaseHold(reservation),
    status: "cancelled",
    cancelledAt: reservation.holdExpiresAt ?? now.toISOString(),
    cancelReason: "hold_expired",
  };
}

/** Je li rezervacija aktivna (blokira stol) u trenutku `now`. */
export function isActiveAt(reservation: Reservation, now: Date): boolean {
  return isActiveReservation(reservation) && !isHoldExpired(reservation, now);
}

export function hasEventStarted(event: Pick<Event, "startsAt">, now: Date): boolean {
  return now.getTime() >= Date.parse(event.startsAt);
}

export type HoldError = "event_started" | "table_unavailable" | "party_too_large";

/** Pravila 1-2 i 7 zajednička gostu i osoblju; vraća grešku ili null. */
export function checkBookable(input: {
  table: Table;
  event: Event;
  partySize: number;
  existing: readonly Reservation[];
  now: Date;
}): HoldError | null {
  const { table, event, partySize, existing, now } = input;
  if (hasEventStarted(event, now)) return "event_started";
  if (partySize > table.capacity) return "party_too_large";
  const taken = existing.some(
    (reservation) => reservation.tableId === table.id && reservation.eventId === event.id && isActiveAt(reservation, now),
  );
  return taken ? "table_unavailable" : null;
}

/**
 * Pravila 1-4: provjera i stvaranje držanja.
 * `existing` su rezervacije istog kluba; poziva se sinkrono unutar spremišta (pravilo 7).
 */
export function createHold(input: {
  id: string;
  code: string;
  request: ReservationRequest;
  table: Table;
  zone: Zone;
  event: Event;
  policy: VenuePolicy;
  existing: readonly Reservation[];
  now: Date;
}): Result<Reservation, HoldError> {
  const { request, table, zone, event, policy, existing, now } = input;
  const blocked = checkBookable({ table, event, partySize: request.partySize, existing, now });
  if (blocked) return fail(blocked);

  const price = calculateTablePrice(zone, event);
  return ok({
    id: input.id,
    venueId: table.venueId,
    eventId: event.id,
    tableId: table.id,
    code: input.code,
    status: "held",
    partySize: request.partySize,
    guestName: request.guestName,
    guestPhone: request.guestPhone,
    minSpendCents: price.minSpendCents,
    depositCents: price.depositCents,
    createdAt: now.toISOString(),
    holdExpiresAt: new Date(now.getTime() + policy.holdMinutes * 60_000).toISOString(),
    source: "guest",
  });
}

export type PaymentError = "hold_expired" | "not_payable";

/** Pravilo 6: demo plaćanje. Uspjeh: held -> paid -> confirmed; neuspjeh ne mijenja rezervaciju. */
export function applyPayment(
  reservation: Reservation,
  result: PaymentResult,
  now: Date,
): Result<Reservation, PaymentError> {
  if (isHoldExpired(reservation, now)) return fail("hold_expired");
  if (reservation.status !== "held") return fail("not_payable");
  if (result === "failed") return ok(reservation);
  const timestamp = now.toISOString();
  return ok({ ...releaseHold(reservation), status: "confirmed", paidAt: timestamp, confirmedAt: timestamp });
}

/** Gost odustaje od držanja prije plaćanja. */
export function abandonHold(reservation: Reservation, now: Date): Result<Reservation, "not_held"> {
  if (reservation.status !== "held" || isHoldExpired(reservation, now)) return fail("not_held");
  return ok({
    ...releaseHold(reservation),
    status: "cancelled",
    cancelledAt: now.toISOString(),
    cancelReason: "payment_abandoned",
  });
}

/** Pravilo 9: ostatak potrošnje u klubu (akontacija se uračunava). */
export function remainingCents(reservation: Pick<Reservation, "minSpendCents" | "depositCents">): number {
  return reservation.minSpendCents - reservation.depositCents;
}
