import { describe, expect, it } from "vitest";
import { ReservationSchema } from "../domain/schemas";
import type { Reservation } from "../domain/types";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB } from "../seed/venues";
import { normalizePhone } from "./phone";
import {
  abandonHold,
  applyPayment,
  createHold,
  expireHold,
  isActiveAt,
  isHoldExpired,
  remainingCents,
  ReservationRequestSchema,
  type ReservationRequest,
} from "./rules";

const data = buildVenueData(DEMO_CLUB, { startDate: "2026-11-12" });
const event = data.events.find((candidate) => candidate.date === "2026-11-14"); // subota, 1.3
const table = data.tables.find((candidate) => candidate.label === "PL1");
const zone = data.zones.find((candidate) => candidate.id === table?.zoneId);
if (!event || !table || !zone) throw new Error("seed");

const now = new Date("2026-11-13T12:00:00Z");
const request: ReservationRequest = { tableId: table.id, date: event.date, partySize: 4, guestName: "Ana", guestPhone: "+385911234567" };

function hold(overrides: Partial<Parameters<typeof createHold>[0]> = {}) {
  return createHold({
    id: "demo-club-rsv-x1",
    code: "ABCDEFGH",
    request,
    table: table!,
    zone: zone!,
    event: event!,
    policy: data.venue.policy,
    existing: [],
    now,
    ...overrides,
  });
}

function heldReservation(): Reservation {
  const result = hold();
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

const minutes = (count: number): Date => new Date(now.getTime() + count * 60_000);

describe("normalizePhone", () => {
  it.each([
    ["091 123 4567", "+385911234567"],
    ["+385 91 123 4567", "+385911234567"],
    ["00385-91-123-4567", "+385911234567"],
    ["+49 151 2345 6789", "+4915123456789"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "abc", "12345", "+0123456789", "91 123"])("odbija %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("ReservationRequestSchema (pravilo 2)", () => {
  it("normalizira mobitel i broj osoba", () => {
    const parsed = ReservationRequestSchema.parse({ ...request, partySize: "3", guestName: "  Ivo  ", guestPhone: "091 123 4567" });
    expect(parsed).toMatchObject({ partySize: 3, guestName: "Ivo", guestPhone: "+385911234567" });
  });

  it("vraća ključeve polja s greškom", () => {
    const result = ReservationRequestSchema.safeParse({ ...request, partySize: 0, guestName: "A", guestPhone: "x" });
    expect(result.success).toBe(false);
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(["partySize", "guestName", "guestPhone"]));
  });
});

describe("createHold (pravila 1-4)", () => {
  it("stvara held s isteka za 10 min i zamrznutom cijenom", () => {
    const reservation = heldReservation();
    expect(reservation).toMatchObject({
      status: "held",
      minSpendCents: 104000,
      depositCents: 31200,
      holdExpiresAt: "2026-11-13T12:10:00.000Z",
      guestName: "Ana",
    });
    expect(ReservationSchema.safeParse(reservation).success).toBe(true);
  });

  it("odbija termin koji je počeo", () => {
    expect(hold({ now: new Date(event.startsAt) })).toEqual({ ok: false, error: "event_started" });
  });

  it("odbija broj osoba veći od kapaciteta", () => {
    expect(hold({ request: { ...request, partySize: table.capacity + 1 } })).toEqual({ ok: false, error: "party_too_large" });
  });

  it("odbija zauzet ili držan stol", () => {
    const existing = heldReservation();
    expect(hold({ existing: [existing] })).toEqual({ ok: false, error: "table_unavailable" });
    const confirmed = applyPayment(existing, "succeeded", minutes(1));
    expect(confirmed.ok && hold({ existing: [confirmed.value] })).toEqual({ ok: false, error: "table_unavailable" });
  });

  it("dopušta stol čije je držanje isteklo ili je otkazan", () => {
    const existing = heldReservation();
    expect(hold({ existing: [existing], now: minutes(10) }).ok).toBe(true);
    const abandoned = abandonHold(existing, minutes(1));
    expect(abandoned.ok && hold({ existing: [abandoned.value] }).ok).toBe(true);
  });
});

describe("istek držanja (pravilo 5)", () => {
  it("held je aktivan do holdExpiresAt, zatim istječe", () => {
    const reservation = heldReservation();
    expect(isHoldExpired(reservation, minutes(9))).toBe(false);
    expect(isActiveAt(reservation, minutes(9))).toBe(true);
    expect(isHoldExpired(reservation, minutes(10))).toBe(true);
    expect(isActiveAt(reservation, minutes(10))).toBe(false);
  });

  it("expireHold prevodi u cancelled / hold_expired", () => {
    const expired = expireHold(heldReservation(), minutes(11));
    expect(expired).toMatchObject({ status: "cancelled", cancelReason: "hold_expired", cancelledAt: "2026-11-13T12:10:00.000Z" });
    expect(expired.holdExpiresAt).toBeUndefined();
    expect(ReservationSchema.safeParse(expired).success).toBe(true);
  });

  it("expireHold ne dira neistekle i druge statuse", () => {
    const reservation = heldReservation();
    expect(expireHold(reservation, minutes(5))).toBe(reservation);
  });
});

describe("demo plaćanje (pravilo 6)", () => {
  it("uspjeh: held -> confirmed s paidAt i confirmedAt", () => {
    const result = applyPayment(heldReservation(), "succeeded", minutes(3));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      status: "confirmed",
      paidAt: "2026-11-13T12:03:00.000Z",
      confirmedAt: "2026-11-13T12:03:00.000Z",
    });
    expect(result.value.holdExpiresAt).toBeUndefined();
  });

  it("neuspjeh ostavlja držanje", () => {
    const reservation = heldReservation();
    expect(applyPayment(reservation, "failed", minutes(3))).toEqual({ ok: true, value: reservation });
  });

  it("odbija istekao hold i već plaćenu rezervaciju", () => {
    const reservation = heldReservation();
    expect(applyPayment(reservation, "succeeded", minutes(10))).toEqual({ ok: false, error: "hold_expired" });
    const paid = applyPayment(reservation, "succeeded", minutes(2));
    expect(paid.ok && applyPayment(paid.value, "succeeded", minutes(3))).toEqual({ ok: false, error: "not_payable" });
  });
});

describe("odustajanje i ostatak (pravilo 9)", () => {
  it("abandonHold otkazuje samo aktivno držanje", () => {
    const reservation = heldReservation();
    const abandoned = abandonHold(reservation, minutes(1));
    expect(abandoned.ok && abandoned.value).toMatchObject({ status: "cancelled", cancelReason: "payment_abandoned" });
    expect(abandonHold(reservation, minutes(10))).toEqual({ ok: false, error: "not_held" });
  });

  it("ostatak u klubu = min. potrošnja - akontacija", () => {
    expect(remainingCents(heldReservation())).toBe(72800);
  });
});
