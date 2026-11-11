import { describe, expect, it } from "vitest";
import { formatEur, formatEventDate, isoDateInTimeZone } from "./format";
import { interpolate, messages } from "./i18n";

const normalize = (value: string): string => value.replace(/\s/g, " ");

describe("format (hr-HR)", () => {
  it("formatira datum termina", () => {
    expect(formatEventDate("2026-11-12")).toBe("četvrtak, 12. studenoga 2026.");
  });

  it("odbija neispravan datum", () => {
    expect(() => formatEventDate("x")).toThrow();
  });

  it("formatira EUR iz centi", () => {
    expect(normalize(formatEur(104000))).toBe("1.040,00 €");
    expect(normalize(formatEur(5850))).toBe("58,50 €");
  });
});

describe("isoDateInTimeZone", () => {
  it("koristi vremensku zonu kluba", () => {
    // 23:30 UTC 11.11. je već 12.11. u Zagrebu (UTC+1).
    const instant = new Date("2026-11-11T23:30:00Z");
    expect(isoDateInTimeZone(instant, "Europe/Zagreb")).toBe("2026-11-12");
    expect(isoDateInTimeZone(instant, "UTC")).toBe("2026-11-11");
  });
});

describe("i18n", () => {
  it("interpolira vrijednosti i ostavlja nepoznate", () => {
    expect(interpolate("Klub {venue} {x}", { venue: "Demo" })).toBe("Klub Demo {x}");
  });

  it("tekstovi ne sadrže interni naziv proizvoda", () => {
    expect(JSON.stringify(messages).toLowerCase()).not.toContain("sova");
  });
});
