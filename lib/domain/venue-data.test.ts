import { describe, expect, it } from "vitest";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB } from "../seed/venues";
import { findDoubleBookings, isActiveReservation } from "./reservation-rules";
import { ReservationSchema, TableSchema, ZoneSchema } from "./schemas";
import type { Reservation, VenueData } from "./types";
import { VenueDataSchema } from "./venue-data";

const base: VenueData = buildVenueData(DEMO_CLUB, { startDate: "2026-11-11" });

function clone(): VenueData {
  return structuredClone(base);
}

function messages(data: unknown): string[] {
  const result = VenueDataSchema.safeParse(data);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

let codeCounter = 0;

function reservation(overrides: Partial<Reservation>): Reservation {
  const first = base.reservations[0];
  if (!first) throw new Error("seed bez rezervacija");
  codeCounter += 1;
  const code = `TESTCD${"23456789"[codeCounter % 8]}${"ABCDEFGH"[Math.floor(codeCounter / 8) % 8]}`;
  const status = overrides.status ?? "confirmed";
  return {
    ...first,
    code,
    status,
    holdExpiresAt: undefined,
    cancelledAt: undefined,
    cancelReason: status === "cancelled" ? "staff" : undefined,
    ...overrides,
  };
}

describe("sheme entiteta", () => {
  it("odbija neispravan oblik stola i nepoznati status", () => {
    expect(TableSchema.safeParse({ ...base.tables[0], shape: "triangle" }).success).toBe(false);
    expect(ReservationSchema.safeParse({ ...base.reservations[0], status: "pending" }).success).toBe(false);
  });

  it("odbija postotak akontacije izvan 1-100", () => {
    expect(ZoneSchema.safeParse({ ...base.zones[0], depositPercent: 0 }).success).toBe(false);
    expect(ZoneSchema.safeParse({ ...base.zones[0], depositPercent: 101 }).success).toBe(false);
  });
});

describe("VenueDataSchema", () => {
  it("prihvaća ispravne podatke", () => {
    expect(messages(base)).toEqual([]);
  });

  it("odbija dvije aktivne rezervacije za isti (stol, event)", () => {
    const data = clone();
    data.reservations = [
      reservation({ id: "r-1", status: "paid" }),
      reservation({ id: "r-2", status: "held", holdExpiresAt: "2026-11-12T20:15:00.000Z" }),
    ];
    expect(messages(data).some((m) => m.includes("Dvostruka aktivna rezervacija"))).toBe(true);
  });

  it("dopušta novu rezervaciju ako je prethodna otkazana ili no_show", () => {
    const data = clone();
    data.reservations = [
      reservation({ id: "r-1", status: "cancelled" }),
      reservation({ id: "r-2", status: "no_show" }),
      reservation({ id: "r-3", status: "confirmed" }),
    ];
    expect(messages(data)).toEqual([]);
  });

  it("odbija nepoznate reference", () => {
    const data = clone();
    data.reservations = [reservation({ id: "r-1", tableId: "ne-postoji" })];
    const table = data.tables[0];
    if (table) table.zoneId = "nema-zone";
    const errors = messages(data);
    expect(errors).toContain("Nepoznat stol: ne-postoji");
    expect(errors).toContain("Nepoznata zona: nema-zone");
  });

  it("zahtijeva holdExpiresAt samo za held", () => {
    const data = clone();
    data.reservations = [reservation({ id: "r-1", status: "held" })];
    expect(messages(data)).toContain("Držana rezervacija mora imati holdExpiresAt");
  });

  it("odbija duplikat koda i cancelled bez razloga", () => {
    const data = clone();
    data.reservations = [
      reservation({ id: "r-1", code: "AAAAAAAA" }),
      reservation({ id: "r-2", code: "AAAAAAAA", eventId: base.events[1]?.id }),
      reservation({ id: "r-3", status: "cancelled", cancelReason: undefined, eventId: base.events[2]?.id }),
    ];
    const errors = messages(data);
    expect(errors).toContain("Duplikat koda: AAAAAAAA");
    expect(errors).toContain("cancelReason je obavezan točno za status cancelled");
  });

  it("odbija broj gostiju veći od kapaciteta", () => {
    const data = clone();
    data.reservations = [reservation({ id: "r-1", partySize: 99 })];
    expect(messages(data).some((m) => m.startsWith("Broj gostiju premašuje"))).toBe(true);
  });
});

describe("reservation-rules", () => {
  it("aktivni statusi", () => {
    expect(isActiveReservation({ status: "held" })).toBe(true);
    expect(isActiveReservation({ status: "checked_in" })).toBe(true);
    expect(isActiveReservation({ status: "cancelled" })).toBe(false);
    expect(isActiveReservation({ status: "no_show" })).toBe(false);
  });

  it("findDoubleBookings vraća drugu konfliktnu rezervaciju", () => {
    expect(
      findDoubleBookings([
        reservation({ id: "a" }),
        reservation({ id: "b", status: "cancelled" }),
        reservation({ id: "c", status: "paid" }),
      ]),
    ).toEqual(["c"]);
  });
});
