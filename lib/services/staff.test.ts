import { describe, expect, it } from "vitest";
import { VenueDataSchema } from "../domain/venue-data";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB, DEMO_CLUB_2 } from "../seed/venues";
import { createMemoryServices } from "./memory";

const raw = [buildVenueData(DEMO_CLUB, { startDate: "2026-11-12" }), buildVenueData(DEMO_CLUB_2, { startDate: "2026-11-12" })];
const DATE = "2026-11-14";

function setup(start = "2026-11-13T12:00:00Z") {
  let current = new Date(start);
  let counter = 0;
  const service = createMemoryServices(raw, {
    now: () => current,
    generateCode: () => {
      counter += 1;
      return `STAFF${"23456789"[counter % 8]}${"ABCDEFGH"[Math.floor(counter / 8) % 8]}Z`;
    },
  });
  return {
    service,
    setNow: (iso: string) => {
      current = new Date(iso);
    },
  };
}

async function freeTableId(service: ReturnType<typeof setup>["service"]) {
  const plan = await service.getFloorplan("demo-club", { date: DATE });
  const table = plan?.tables.find((candidate) => plan.availability[candidate.id] === "free");
  if (!table) throw new Error("nema slobodnog stola");
  return table.id;
}

describe("javni podaci kluba", () => {
  it("hash PIN-a nikad ne izlazi iz servisa prema UI-ju", async () => {
    const { service } = setup();
    const plan = await service.getFloorplan("demo-club");
    expect(JSON.stringify(plan)).not.toContain("adminPinHash");
    expect(JSON.stringify(await service.getVenue("demo-club"))).not.toContain("adminPinHash");
    expect(await service.getAdminPinHash("demo-club")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("servisi osoblja", () => {
  it("ručna potvrđena rezervacija bilježi akontaciju izvan aplikacije i boji stol", async () => {
    const { service } = setup();
    const tableId = await freeTableId(service);
    const created = await service.staffCreateReservation("demo-club", {
      tableId,
      date: DATE,
      kind: "confirmed",
      partySize: "2",
      guestName: "Poznati Gost",
      guestPhone: "",
    });
    expect(created.ok).toBe(true);
    const plan = await service.getFloorplan("demo-club", { date: DATE });
    expect(plan?.availability[tableId]).toBe("booked");
    const snapshot = await service.snapshot("demo-club");
    expect(snapshot?.paymentAttempts.at(-1)).toMatchObject({ method: "venue", result: "succeeded" });
    expect(VenueDataSchema.safeParse(snapshot).success).toBe(true);
  });

  it("ručna rezervacija: validacija i pravila", async () => {
    const { service } = setup();
    const tableId = await freeTableId(service);
    expect(
      await service.staffCreateReservation("demo-club", { tableId, date: DATE, kind: "x", partySize: "0", guestName: "A", guestPhone: "1" }),
    ).toEqual({ ok: false, error: "invalid", fields: ["partySize", "guestName", "guestPhone", "kind"] });
    const input = { tableId, date: DATE, kind: "hold", partySize: "2", guestName: "Promotor", guestPhone: "" };
    expect((await service.staffCreateReservation("demo-club", input)).ok).toBe(true);
    expect(await service.staffCreateReservation("demo-club", input)).toEqual({ ok: false, error: "table_unavailable" });
  });

  it("popis termina s brojkama i akcijama; check-in i no-show tijekom termina", async () => {
    const { service, setNow } = setup();
    const tableId = await freeTableId(service);
    const created = await service.staffCreateReservation("demo-club", {
      tableId,
      date: DATE,
      kind: "confirmed",
      partySize: "4",
      guestName: "Ana",
      guestPhone: "091 111 2222",
    });
    if (!created.ok) throw new Error(created.error);

    let list = await service.listEventReservations("demo-club", DATE);
    const before = list?.counts;
    expect(list?.rows.find((row) => row.reservation.code === created.code)?.actions).toEqual({
      checkIn: false,
      noShow: false,
      cancel: true,
    });
    expect(await service.staffCheckIn("demo-club", created.code)).toEqual({ ok: false, error: "outside_window" });

    setNow("2026-11-14T22:30:00Z"); // 23:30 po Zagrebu
    const checked = await service.staffCheckIn("demo-club", created.code);
    expect(checked.ok && checked.reservation.status).toBe("checked_in");
    list = await service.listEventReservations("demo-club", DATE);
    expect(list?.counts.arrived).toBe((before?.arrived ?? 0) + 1);
    expect(await service.staffCheckIn("demo-club", created.code)).toEqual({ ok: false, error: "already_checked_in" });

    const labels = list?.rows.map((row) => row.table.label) ?? [];
    expect(labels).toEqual([...labels].sort(new Intl.Collator("hr", { numeric: true }).compare));
    expect(list?.rows.some((row) => row.reservation.status === "cancelled")).toBe(false);
  });

  it("no-show i otkazivanje oslobađaju stol na tlocrtu gosta", async () => {
    const { service, setNow } = setup();
    const tableA = await freeTableId(service);
    const a = await service.staffCreateReservation("demo-club", { tableId: tableA, date: DATE, kind: "confirmed", partySize: "2", guestName: "Ana", guestPhone: "" });
    const tableB = await freeTableId(service);
    const b = await service.staffCreateReservation("demo-club", { tableId: tableB, date: DATE, kind: "confirmed", partySize: "2", guestName: "Ivo", guestPhone: "" });
    if (!a.ok || !b.ok) throw new Error("create");

    expect((await service.staffCancel("demo-club", a.code)).ok).toBe(true);
    setNow("2026-11-14T23:00:00Z");
    expect((await service.staffNoShow("demo-club", b.code)).ok).toBe(true);
    const plan = await service.getFloorplan("demo-club", { date: DATE });
    expect(plan?.availability[tableA]).toBe("free");
    expect(plan?.availability[tableB]).toBe("free");
    expect(await service.staffCancel("demo-club", "NEMAKODA")).toEqual({ ok: false, error: "not_found" });
  });

  it("pregled rezervacije nosi akcije osoblja", async () => {
    const { service } = setup();
    const tableId = await freeTableId(service);
    const created = await service.staffCreateReservation("demo-club", { tableId, date: DATE, kind: "confirmed", partySize: "2", guestName: "Ana", guestPhone: "" });
    if (!created.ok) throw new Error("create");
    const view = await service.getReservation("demo-club", created.code);
    expect(view?.staffActions).toEqual({ checkIn: false, noShow: false, cancel: true });
    expect(JSON.stringify(view)).not.toContain("adminPinHash");
  });
});
