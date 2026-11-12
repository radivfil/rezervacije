import { describe, expect, it } from "vitest";
import { zonedDateTimeToUtc } from "./time";

describe("zonedDateTimeToUtc", () => {
  it("zimsko vrijeme u Zagrebu (UTC+1)", () => {
    expect(zonedDateTimeToUtc("2026-11-12", "23:00", "Europe/Zagreb").toISOString()).toBe("2026-11-12T22:00:00.000Z");
  });

  it("ljetno vrijeme u Zagrebu (UTC+2)", () => {
    expect(zonedDateTimeToUtc("2026-07-10", "23:00", "Europe/Zagreb").toISOString()).toBe("2026-07-10T21:00:00.000Z");
  });

  it("UTC zona", () => {
    expect(zonedDateTimeToUtc("2026-11-12", "08:30", "UTC").toISOString()).toBe("2026-11-12T08:30:00.000Z");
  });

  it("odbija neispravan unos", () => {
    expect(() => zonedDateTimeToUtc("12.11.2026", "23:00", "UTC")).toThrow();
    expect(() => zonedDateTimeToUtc("2026-11-12", "23h", "UTC")).toThrow();
  });
});
