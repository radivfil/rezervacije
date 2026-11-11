import { describe, expect, it } from "vitest";
import { getFloorplan, getVenue, listEvents, listVenueSlugs } from "./venues";

describe("venue service", () => {
  it("vraća oba demo kluba", async () => {
    expect((await listVenueSlugs()).sort()).toEqual(["demo-club", "demo-club-2"]);
  });

  it("nepoznat slug daje null", async () => {
    expect(await getVenue("ne-postoji")).toBeNull();
    expect(await getFloorplan("ne-postoji")).toBeNull();
    expect(await listEvents("ne-postoji")).toEqual([]);
  });

  it("termini su sortirani po datumu", async () => {
    const dates = (await listEvents("demo-club")).map((event) => event.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("tlocrt ima 2 etaže, 90 stolova i status za svaki stol", async () => {
    const plan = await getFloorplan("demo-club");
    expect(plan?.floors.map((floor) => floor.order)).toEqual([0, 1]);
    expect(plan?.tables).toHaveLength(90);
    expect(Object.keys(plan?.availability ?? {})).toHaveLength(90);
  });

  it("bira termin po eventId ili prvi od zadanog datuma", async () => {
    const events = await listEvents("demo-club");
    const third = events[2];
    expect(third).toBeDefined();
    expect((await getFloorplan("demo-club", { eventId: third?.id }))?.event?.id).toBe(third?.id);
    expect((await getFloorplan("demo-club", { fromDate: third?.date }))?.event?.id).toBe(third?.id);
  });

  it("barem jedan termin ima i slobodne i zauzete stolove", async () => {
    const events = await listEvents("demo-club");
    const plans = await Promise.all(events.map((event) => getFloorplan("demo-club", { eventId: event.id })));
    const mixed = plans.some((plan) => {
      const values = Object.values(plan?.availability ?? {});
      return values.includes("free") && values.includes("booked");
    });
    expect(mixed).toBe(true);
  });

  it("bira termin po točnom datumu, a nepoznat datum pada na prvi od fromDate", async () => {
    const events = await listEvents("demo-club");
    const fifth = events[4];
    expect((await getFloorplan("demo-club", { date: fifth?.date }))?.event?.id).toBe(fifth?.id);
    const fallback = await getFloorplan("demo-club", { date: "2026-11-16", fromDate: events[1]?.date });
    expect(fallback?.event?.id).toBe(events[1]?.id);
  });

  it("ne vraća prošli termin zadan preko date", async () => {
    const events = await listEvents("demo-club");
    const plan = await getFloorplan("demo-club", { date: events[0]?.date, fromDate: events[2]?.date });
    expect(plan?.event?.id).toBe(events[2]?.id);
  });

  it("vraća samo termine od fromDate", async () => {
    const events = await listEvents("demo-club");
    const plan = await getFloorplan("demo-club", { fromDate: events[3]?.date });
    expect(plan?.events[0]?.id).toBe(events[3]?.id);
    expect(plan?.events).toHaveLength(events.length - 3);
  });

  it("promjena datuma mijenja množitelj i statuse stolova", async () => {
    const events = await listEvents("demo-club");
    const plans = await Promise.all(events.map((event) => getFloorplan("demo-club", { date: event.date })));
    const multipliers = new Set(plans.map((plan) => plan?.event?.priceMultiplier));
    expect(multipliers).toEqual(new Set([0.6, 1, 1.3, 1.5]));
    const signatures = new Set(plans.map((plan) => JSON.stringify(plan?.availability)));
    expect(signatures.size).toBeGreaterThan(1);
  });
});
