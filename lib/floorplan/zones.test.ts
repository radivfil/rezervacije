import { describe, expect, it } from "vitest";
import demo from "../../data/venues/demo-club.json";
import { zoneAreas } from "./zones";

const box = (zoneId: string, x: number, y: number) => ({ zoneId, x, y, width: 50, height: 50 });

describe("zoneAreas", () => {
  it("bliski stolovi iste zone čine jedno područje s paddingom", () => {
    const areas = zoneAreas([box("a", 0, 0), box("a", 60, 0), box("a", 0, 60)], 20, 8);
    expect(areas).toEqual([{ zoneId: "a", x: -8, y: -8, width: 126, height: 126 }]);
  });

  it("udaljene skupine iste zone ostaju odvojene", () => {
    const areas = zoneAreas([box("a", 0, 0), box("a", 60, 0), box("a", 500, 0)], 20, 0);
    expect(areas).toHaveLength(2);
    expect(areas.map((area) => area.width).sort((x, y) => x - y)).toEqual([50, 110]);
  });

  it("susjedni stolovi različitih zona se ne spajaju", () => {
    const areas = zoneAreas([box("a", 0, 0), box("b", 60, 0)], 20, 0);
    expect(areas.map((area) => area.zoneId).sort()).toEqual(["a", "b"]);
  });

  it("lanac stolova spaja se u jednu skupinu neovisno o redoslijedu", () => {
    const areas = zoneAreas([box("a", 0, 0), box("a", 120, 0), box("a", 60, 0)], 20, 0);
    expect(areas).toEqual([{ zoneId: "a", x: 0, y: 0, width: 170, height: 50 }]);
  });

  it("demo tlocrt: svaki stol leži u području svoje zone", () => {
    const tables = demo.tables.filter((table) => table.floorId === "demo-club-prizemlje");
    const areas = zoneAreas(tables, 24, 8);
    expect(areas.length).toBeGreaterThanOrEqual(3);
    expect(areas.length).toBeLessThan(tables.length / 2);
    for (const table of tables) {
      const inside = areas.some(
        (area) =>
          area.zoneId === table.zoneId &&
          table.x >= area.x &&
          table.y >= area.y &&
          table.x + table.width <= area.x + area.width &&
          table.y + table.height <= area.y + area.height,
      );
      expect(inside).toBe(true);
    }
  });
});
