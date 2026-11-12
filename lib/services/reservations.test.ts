import { describe, expect, it } from "vitest";
import { findDoubleBookings } from "../domain/reservation-rules";
import { VenueDataSchema } from "../domain/venue-data";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB, DEMO_CLUB_2 } from "../seed/venues";
import { createMemoryServices } from "./memory";

const raw = [buildVenueData(DEMO_CLUB, { startDate: "2026-11-12" }), buildVenueData(DEMO_CLUB_2, { startDate: "2026-11-12" })];

function setup(start = "2026-11-13T12:00:00Z") {
  let current = new Date(start);
  let counter = 0;
  const service = createMemoryServices(raw, {
    now: () => current,
    generateCode: () => {
      counter += 1;
      return `TESTAB${"23456789"[counter % 8]}${"CDEFGHJK"[Math.floor(counter / 8) % 8]}`;
    },
  });
  return {
    service,
    advance: (minutes: number) => {
      current = new Date(current.getTime() + minutes * 60_000);
    },
  };
}

async function freeTable(service: ReturnType<typeof setup>["service"], date: string) {
  const plan = await service.getFloorplan("demo-club", { date });
  const table = plan?.tables.find((candidate) => plan.availability[candidate.id] === "free");
  if (!table) throw new Error("nema slobodnog stola");
  return table;
}

const request = (tableId: string, overrides: Record<string, unknown> = {}) => ({
  tableId,
  date: "2026-11-14",
  partySize: "2",
  guestName: "Ana Anić",
  guestPhone: "091 123 4567",
  ...overrides,
});

describe("memorijski servis rezervacija", () => {
  it("držanje odmah boji stol žuto, plaćanje crveno", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const created = await service.createReservation("demo-club", request(table.id));
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    let plan = await service.getFloorplan("demo-club", { date: "2026-11-14" });
    expect(plan?.availability[table.id]).toBe("held");

    const paid = await service.payReservation("demo-club", created.code, "succeeded");
    expect(paid.ok && paid.reservation.status).toBe("confirmed");
    plan = await service.getFloorplan("demo-club", { date: "2026-11-14" });
    expect(plan?.availability[table.id]).toBe("booked");
  });

  it("drugi zahtjev za isti stol i termin je odbijen (pravilo 7)", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const [first, second] = await Promise.all([
      service.createReservation("demo-club", request(table.id)),
      service.createReservation("demo-club", request(table.id, { guestName: "Ivo Ivić" })),
    ]);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: "table_unavailable" });
    const snapshot = await service.snapshot("demo-club");
    expect(findDoubleBookings(snapshot?.reservations ?? [])).toEqual([]);
  });

  it("istek držanja oslobađa stol i onemogućuje plaćanje (pravilo 5)", async () => {
    const { service, advance } = setup();
    const table = await freeTable(service, "2026-11-14");
    const created = await service.createReservation("demo-club", request(table.id));
    if (!created.ok) throw new Error(created.error);
    advance(10);
    const plan = await service.getFloorplan("demo-club", { date: "2026-11-14" });
    expect(plan?.availability[table.id]).toBe("free");
    expect(await service.payReservation("demo-club", created.code, "succeeded")).toEqual({ ok: false, error: "not_payable" });
    const view = await service.getReservation("demo-club", created.code);
    expect(view?.reservation).toMatchObject({ status: "cancelled", cancelReason: "hold_expired" });
  });

  it("neuspjelo plaćanje se bilježi, rezervacija ostaje held", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const created = await service.createReservation("demo-club", request(table.id));
    if (!created.ok) throw new Error(created.error);
    const failed = await service.payReservation("demo-club", created.code, "failed");
    expect(failed.ok && failed.reservation.status).toBe("held");
    const snapshot = await service.snapshot("demo-club");
    expect(snapshot?.paymentAttempts).toHaveLength(1);
    const reservation = snapshot?.reservations.find((candidate) => candidate.code === created.code);
    expect(snapshot?.paymentAttempts[0]).toMatchObject({ result: "failed", amountCents: reservation?.depositCents });
    expect(reservation?.depositCents).toBeGreaterThan(0);
    expect(VenueDataSchema.safeParse(snapshot).success).toBe(true);
  });

  it("odustajanje oslobađa stol", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const created = await service.createReservation("demo-club", request(table.id));
    if (!created.ok) throw new Error(created.error);
    const abandoned = await service.abandonReservation("demo-club", created.code);
    expect(abandoned.ok && abandoned.reservation.cancelReason).toBe("payment_abandoned");
    expect((await service.createReservation("demo-club", request(table.id))).ok).toBe(true);
  });

  it("validacija ulaza vraća polja s greškom", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const result = await service.createReservation("demo-club", request(table.id, { partySize: "0", guestPhone: "abc" }));
    expect(result).toEqual({ ok: false, error: "invalid", fields: ["partySize", "guestPhone"] });
  });

  it("nepoznat klub, stol ili datum", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    expect(await service.createReservation("nema", request(table.id))).toEqual({ ok: false, error: "not_found" });
    expect(await service.createReservation("demo-club", request("nema-stola"))).toEqual({ ok: false, error: "not_found" });
    expect(await service.createReservation("demo-club", request(table.id, { date: "2026-11-16" }))).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(await service.getReservation("demo-club", "ZZZZZZZZ")).toBeNull();
  });

  it("kod jednog kluba ne otvara rezervaciju drugog", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const created = await service.createReservation("demo-club", request(table.id));
    if (!created.ok) throw new Error(created.error);
    expect(await service.getReservation("demo-club-2", created.code)).toBeNull();
  });

  it("termin koji je počeo nije otvoren za rezervacije", async () => {
    const { service } = setup("2026-11-14T22:30:00Z");
    const plan = await service.getFloorplan("demo-club", { date: "2026-11-14" });
    expect(plan?.bookingOpen).toBe(false);
    const table = plan?.tables.find((candidate) => plan.availability[candidate.id] === "free");
    expect(await service.createReservation("demo-club", request(table?.id ?? ""))).toEqual({
      ok: false,
      error: "event_started",
    });
  });

  it("booking kontekst nosi cijenu i dostupnost", async () => {
    const { service } = setup();
    const table = await freeTable(service, "2026-11-14");
    const context = await service.getBookingContext("demo-club", table.id, "2026-11-14");
    expect(context).toMatchObject({ availability: "free", bookingOpen: true, event: { date: "2026-11-14" } });
    expect(context?.price.depositCents).toBeGreaterThan(0);
  });
});
