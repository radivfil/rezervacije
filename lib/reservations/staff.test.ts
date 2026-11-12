import { describe, expect, it } from "vitest";
import { ReservationSchema } from "../domain/schemas";
import type { Reservation } from "../domain/types";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB } from "../seed/venues";
import { applyPayment, createHold } from "./rules";
import {
  allowedStaffActions,
  checkIn,
  createStaffReservation,
  markNoShow,
  staffCancel,
  StaffReservationRequestSchema,
  type StaffReservationRequest,
} from "./staff";

const data = buildVenueData(DEMO_CLUB, { startDate: "2026-11-12" });
const event = data.events.find((candidate) => candidate.date === "2026-11-14");
const table = data.tables.find((candidate) => candidate.label === "V3");
const zone = data.zones.find((candidate) => candidate.id === table?.zoneId);
if (!event || !table || !zone) throw new Error("seed");
const start = Date.parse(event.startsAt);
const at = (hoursFromStart: number) => new Date(start + hoursFromStart * 3_600_000);
const booking = new Date("2026-11-13T12:00:00Z");

function held(): Reservation {
  const result = createHold({
    id: "demo-club-rsv-t1",
    code: "ABCDEFGH",
    request: { tableId: table!.id, date: event!.date, partySize: 4, guestName: "Ana", guestPhone: "+385911234567" },
    table: table!,
    zone: zone!,
    event: event!,
    policy: data.venue.policy,
    existing: [],
    now: booking,
  });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function confirmed(): Reservation {
  const result = applyPayment(held(), "succeeded", new Date(booking.getTime() + 60_000));
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("check-in (pravilo 5)", () => {
  it("dopušten od 3 h prije do 8 h nakon početka", () => {
    expect(checkIn(confirmed(), event, at(-3.01))).toEqual({ ok: false, error: "outside_window" });
    const result = checkIn(confirmed(), event, at(-3));
    expect(result.ok && result.value).toMatchObject({ status: "checked_in", checkedInAt: at(-3).toISOString() });
    expect(checkIn(confirmed(), event, at(8)).ok).toBe(true);
    expect(checkIn(confirmed(), event, at(8.01))).toEqual({ ok: false, error: "outside_window" });
  });

  it("samo za plaćene; ponovljeni check-in javlja da je već označen", () => {
    expect(checkIn(held(), event, at(0))).toEqual({ ok: false, error: "not_confirmed" });
    const first = checkIn(confirmed(), event, at(0));
    expect(first.ok && checkIn(first.value, event, at(1))).toEqual({ ok: false, error: "already_checked_in" });
    expect(first.ok && ReservationSchema.safeParse(first.value).success).toBe(true);
  });
});

describe("no-show (pravilo 6)", () => {
  it("tek nakon početka termina, samo za plaćene", () => {
    expect(markNoShow(confirmed(), event, at(-0.1))).toEqual({ ok: false, error: "too_early" });
    const result = markNoShow(confirmed(), event, at(1));
    expect(result.ok && result.value).toMatchObject({ status: "no_show", noShowAt: at(1).toISOString() });
    expect(markNoShow(held(), event, at(1))).toEqual({ ok: false, error: "not_confirmed" });
  });
});

describe("otkazivanje osoblja (pravilo 7)", () => {
  it("held, paid i confirmed se mogu otkazati", () => {
    for (const reservation of [held(), confirmed()]) {
      const result = staffCancel(reservation, new Date(booking.getTime() + 2 * 60_000));
      expect(result.ok && result.value).toMatchObject({ status: "cancelled", cancelReason: "staff" });
      expect(result.ok && result.value.holdExpiresAt).toBeUndefined();
    }
  });

  it("nakon check-ina ili isteka nije moguće", () => {
    const checked = checkIn(confirmed(), event, at(0));
    expect(checked.ok && staffCancel(checked.value, at(1))).toEqual({ ok: false, error: "not_cancellable" });
    expect(staffCancel(held(), at(-20))).toEqual({ ok: false, error: "not_cancellable" });
  });
});

describe("allowedStaffActions", () => {
  it("prije termina: samo otkazivanje; tijekom: check-in, no-show, otkazivanje", () => {
    expect(allowedStaffActions(confirmed(), event, booking)).toEqual({ checkIn: false, noShow: false, cancel: true });
    expect(allowedStaffActions(confirmed(), event, at(1))).toEqual({ checkIn: true, noShow: true, cancel: true });
  });
});

describe("ručna rezervacija (pravilo 8)", () => {
  const request: StaffReservationRequest = { tableId: table.id, date: event.date, kind: "confirmed", partySize: 6, guestName: "Gost VIP", guestPhone: undefined };
  const create = (overrides: Partial<Parameters<typeof createStaffReservation>[0]> = {}) =>
    createStaffReservation({ id: "demo-club-rsv-s1", code: "STAFF234", request, table, zone, event, existing: [], now: booking, ...overrides });

  it("potvrđena: akontacija primljena izvan aplikacije", () => {
    const result = create();
    expect(result.ok && result.value).toMatchObject({
      status: "confirmed",
      source: "staff",
      paidAt: booking.toISOString(),
      minSpendCents: 65000, // VIP 500 € x 1.3
      depositCents: 19500,
    });
    expect(result.ok && result.value.guestPhone).toBeUndefined();
    expect(result.ok && ReservationSchema.safeParse(result.value).success).toBe(true);
  });

  it("držanje do početka termina", () => {
    const result = create({ request: { ...request, kind: "hold", guestPhone: "+385911234567" } });
    expect(result.ok && result.value).toMatchObject({ status: "held", holdExpiresAt: event.startsAt, guestPhone: "+385911234567" });
  });

  it("ista pravila kao za gosta", () => {
    expect(create({ existing: [held()] })).toEqual({ ok: false, error: "table_unavailable" });
    expect(create({ now: at(0) })).toEqual({ ok: false, error: "event_started" });
    expect(create({ request: { ...request, partySize: 99 } })).toEqual({ ok: false, error: "party_too_large" });
  });

  it("shema: mobitel opcionalan, ostalo obavezno", () => {
    const parsed = StaffReservationRequestSchema.parse({ ...request, partySize: "2", guestPhone: "" });
    expect(parsed.guestPhone).toBeUndefined();
    const invalid = StaffReservationRequestSchema.safeParse({ ...request, kind: "x", guestName: "A", guestPhone: "123" });
    expect(invalid.success).toBe(false);
  });
});
