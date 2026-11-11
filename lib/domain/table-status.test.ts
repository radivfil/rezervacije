import { describe, expect, it } from "vitest";
import { computeTableAvailability } from "./table-status";

const tables = [{ id: "t1" }, { id: "t2" }, { id: "t3" }, { id: "t4" }];

describe("computeTableAvailability", () => {
  it("mapira statuse rezervacija na slobodan / držan / zauzet", () => {
    const result = computeTableAvailability(
      tables,
      [
        { tableId: "t1", eventId: "e1", status: "confirmed" },
        { tableId: "t2", eventId: "e1", status: "held" },
        { tableId: "t3", eventId: "e1", status: "cancelled" },
        { tableId: "t4", eventId: "e2", status: "paid" },
      ],
      "e1",
    );
    expect(result).toEqual({ t1: "booked", t2: "held", t3: "free", t4: "free" });
  });

  it("paid, confirmed i checked_in su zauzeti, no_show slobodan", () => {
    for (const status of ["paid", "confirmed", "checked_in"] as const) {
      expect(computeTableAvailability(tables, [{ tableId: "t1", eventId: "e", status }], "e").t1).toBe("booked");
    }
    expect(computeTableAvailability(tables, [{ tableId: "t1", eventId: "e", status: "no_show" }], "e").t1).toBe("free");
  });

  it("otkazana rezervacija ne poništava aktivnu", () => {
    const result = computeTableAvailability(
      tables,
      [
        { tableId: "t1", eventId: "e", status: "confirmed" },
        { tableId: "t1", eventId: "e", status: "cancelled" },
      ],
      "e",
    );
    expect(result.t1).toBe("booked");
  });

  it("ignorira rezervacije za nepoznate stolove", () => {
    const result = computeTableAvailability(tables, [{ tableId: "x", eventId: "e", status: "paid" }], "e");
    expect(Object.keys(result)).toEqual(["t1", "t2", "t3", "t4"]);
  });
});
