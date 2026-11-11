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
});
