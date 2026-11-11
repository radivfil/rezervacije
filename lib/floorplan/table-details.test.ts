import { describe, expect, it } from "vitest";
import { buildVenueData } from "../seed/build";
import { DEMO_CLUB } from "../seed/venues";
import { buildTableDetails } from "./table-details";

const data = buildVenueData(DEMO_CLUB, { startDate: "2026-11-11" });
const platinum = data.tables.find((table) => table.label === "PL1");
if (!platinum) throw new Error("PL1");

const base = {
  table: platinum,
  zones: data.zones,
  floors: data.floors,
  availability: { [platinum.id]: "held" as const },
  policy: data.venue.policy,
};

describe("buildTableDetails", () => {
  it("vraća zonu, etažu, kapacitet, status i uvjete", () => {
    const details = buildTableDetails({ ...base, event: { priceMultiplier: 1 } });
    expect(details).toMatchObject({
      label: "PL1",
      zoneName: "Platinum",
      floorName: "Prizemlje",
      capacity: 10,
      availability: "held",
      freeCancellationHours: 48,
    });
  });

  it("cijena i akontacija ovise o terminu", () => {
    const thursday = buildTableDetails({ ...base, event: { priceMultiplier: 0.6 } });
    const saturday = buildTableDetails({ ...base, event: { priceMultiplier: 1.3 } });
    expect(thursday.price).toMatchObject({ minSpendCents: 48000, depositCents: 14400, depositPercent: 30 });
    expect(saturday.price).toMatchObject({ minSpendCents: 104000, depositCents: 31200 });
  });

  it("bez termina nema cijene, a nepoznati stol je slobodan", () => {
    const details = buildTableDetails({ ...base, availability: {}, event: null });
    expect(details.price).toBeNull();
    expect(details.availability).toBe("free");
  });

  it("baca grešku za stol bez zone", () => {
    expect(() =>
      buildTableDetails({ ...base, table: { ...platinum, zoneId: "nema" }, event: null }),
    ).toThrow();
  });
});
