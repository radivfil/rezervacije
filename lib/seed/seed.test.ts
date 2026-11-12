import { describe, expect, it } from "vitest";
import { findDoubleBookings, isActiveReservation } from "../domain/reservation-rules";
import { VenueDataSchema } from "../domain/venue-data";
import type { VenueData } from "../domain/types";
import { buildVenueData } from "./build";
import { generateEvents } from "./events";
import { DEFAULT_FLOORS } from "./layout";
import { createRandom } from "./random";
import { DEMO_CLUB, DEMO_CLUB_2 } from "./venues";

const START = "2026-11-11"; // srijeda

interface Box {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function countByZone(data: VenueData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of data.tables) {
    const zone = data.zones.find((z) => z.id === table.zoneId);
    if (!zone) throw new Error("zona");
    counts[zone.name] = (counts[zone.name] ?? 0) + 1;
  }
  return counts;
}

describe("createRandom", () => {
  it("je deterministički", () => {
    const a = createRandom(1);
    const b = createRandom(1);
    expect([a.next(), a.next(), a.int(1, 6)]).toEqual([b.next(), b.next(), b.int(1, 6)]);
  });

  it("int ostaje u granicama", () => {
    const random = createRandom(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = random.int(2, 5);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
    }
  });
});

describe("generateEvents", () => {
  const events = generateEvents("demo-club", START, 8);

  it("samo čet/pet/sub, 3 termina tjedno", () => {
    expect(events).toHaveLength(24);
    for (const event of events) {
      expect([4, 5, 6]).toContain(new Date(`${event.date}T00:00:00Z`).getUTCDay());
    }
  });

  it("redovni termini imaju množitelje 0.6 / 1 / 1.3, posebni 1.5", () => {
    for (const event of events) {
      const weekday = new Date(`${event.date}T00:00:00Z`).getUTCDay();
      if (event.kind === "special") expect(event.priceMultiplier).toBe(1.5);
      else expect(event.priceMultiplier).toBe({ 4: 0.6, 5: 1, 6: 1.3 }[weekday]);
    }
    expect(events.filter((event) => event.kind === "special").length).toBeGreaterThanOrEqual(2);
  });

  it("prvi termin je četvrtak nakon početnog datuma", () => {
    expect(events[0]?.date).toBe("2026-11-12");
  });
});

describe("layout", () => {
  it.each(DEFAULT_FLOORS.map((floor) => [floor.name, floor] as const))(
    "%s: stolovi i dekoracije se ne preklapaju i unutar su etaže",
    (_name, floor) => {
      const boxes: Box[] = [
        ...floor.decorations.map((d, i) => ({ ...d, id: `dec-${i}` })),
        ...floor.zones.flatMap((zone) =>
          zone.positions.map((p, i) => ({ id: `${zone.key}-${i}`, x: p.x, y: p.y, width: zone.width, height: zone.height })),
        ),
      ];
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(floor.width);
        expect(box.y + box.height).toBeLessThanOrEqual(floor.height);
      }
      const collisions: string[] = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          if (a && b && overlaps(a, b)) collisions.push(`${a.id} x ${b.id}`);
        }
      }
      expect(collisions).toEqual([]);
    },
  );
});

describe("buildVenueData (Demo Club)", () => {
  const data = buildVenueData(DEMO_CLUB, { startDate: START });

  it("ima 2 etaže i 90 stolova", () => {
    expect(data.floors.map((floor) => floor.name)).toEqual(["Prizemlje", "Kat"]);
    expect(data.tables).toHaveLength(90);
    const perFloor = data.floors.map((floor) => data.tables.filter((t) => t.floorId === floor.id).length);
    expect(perFloor).toEqual([50, 40]);
  });

  it("zone, broj stolova i min. potrošnja prema canvasu", () => {
    expect(countByZone(data)).toEqual({
      Standard: 30,
      Premium: 16,
      Platinum: 4,
      Lounge: 24,
      VIP: 12,
      Balkon: 4,
    });
    const minSpend = Object.fromEntries(data.zones.map((zone) => [zone.name, zone.minSpend]));
    expect(minSpend).toEqual({ Standard: 150, Premium: 300, Platinum: 800, Lounge: 250, VIP: 500, Balkon: 1000 });
    expect(data.zones.every((zone) => zone.depositPercent === 30)).toBe(true);
  });

  it("prizemlje ima šank, DJ, podij, stepenice i WC", () => {
    const ground = data.floors[0];
    const kinds = data.decorations.filter((d) => d.floorId === ground?.id).map((d) => d.kind);
    expect(kinds).toEqual(expect.arrayContaining(["bar", "dj", "dancefloor", "stairs", "wc"]));
  });

  it("ima ~40 rezervacija s raznim statusima", () => {
    expect(data.reservations).toHaveLength(40);
    const statuses = new Set(data.reservations.map((r) => r.status));
    for (const status of ["held", "paid", "confirmed"] as const) expect(statuses.has(status)).toBe(true);
    expect(statuses.size).toBeGreaterThanOrEqual(4);
  });

  it("nikad dvije aktivne rezervacije za isti (stol, event)", () => {
    expect(findDoubleBookings(data.reservations)).toEqual([]);
    const keys = data.reservations.filter(isActiveReservation).map((r) => `${r.tableId}|${r.eventId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("bez osobnih podataka gostiju", () => {
    for (const reservation of data.reservations) {
      expect(Object.keys(reservation).sort()).toEqual(
        expect.arrayContaining(["id", "eventId", "tableId", "status", "partySize", "createdAt"]),
      );
      for (const key of Object.keys(reservation)) {
        expect([
          "id",
          "venueId",
          "eventId",
          "tableId",
          "code",
          "status",
          "partySize",
          "minSpendCents",
          "depositCents",
          "promoterId",
          "createdAt",
          "holdExpiresAt",
          "paidAt",
          "confirmedAt",
          "cancelledAt",
          "cancelReason",
        ]).toContain(key);
      }
    }
  });

  it("held iz seeda drži stol do početka termina, cijena je zamrznuta", () => {
    for (const reservation of data.reservations) {
      const event = data.events.find((candidate) => candidate.id === reservation.eventId);
      if (reservation.status === "held") expect(reservation.holdExpiresAt).toBe(event?.startsAt);
      expect(reservation.depositCents).toBe(Math.round(reservation.minSpendCents * 0.3));
    }
  });

  it("termini počinju u 23:00 po vremenu kluba", () => {
    expect(data.events[0]?.startsAt).toBe("2026-11-12T22:00:00.000Z");
  });

  it("je deterministički za isti početni datum", () => {
    expect(buildVenueData(DEMO_CLUB, { startDate: START })).toEqual(data);
  });

  it("prolazi validaciju sheme", () => {
    expect(VenueDataSchema.safeParse(data).success).toBe(true);
  });
});

describe("buildVenueData (drugi klub)", () => {
  const first = buildVenueData(DEMO_CLUB, { startDate: START });
  const second = buildVenueData(DEMO_CLUB_2, { startDate: START });

  it("ima drugi slug, naziv, logo, boje i font", () => {
    expect(second.venue.slug).toBe("demo-club-2");
    expect(second.venue.name).not.toBe(first.venue.name);
    expect(second.venue.theme.logoUrl).not.toBe(first.venue.theme.logoUrl);
    expect(second.venue.theme.colors).not.toEqual(first.venue.theme.colors);
    expect(second.venue.theme.fontFamily).not.toBe(first.venue.theme.fontFamily);
  });

  it("ID-evi ne kolidiraju s prvim klubom", () => {
    const firstIds = new Set(first.tables.map((t) => t.id));
    expect(second.tables.some((t) => firstIds.has(t.id))).toBe(false);
  });
});
