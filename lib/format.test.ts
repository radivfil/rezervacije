import { describe, expect, it } from "vitest";
import {
  formatEur,
  formatCountdown,
  formatEventDate,
  formatMultiplier,
  formatReservationCode,
  formatTime,
  formatShortDate,
  formatShortWeekday,
  isoDateInTimeZone,
} from "./format";
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

describe("kratki formati", () => {
  it("dan i datum", () => {
    expect(formatShortWeekday("2026-11-12")).toBe("čet");
    expect(normalize(formatShortDate("2026-11-12"))).toBe("12. 11.");
  });

  it("množitelj s decimalnim zarezom", () => {
    expect(formatMultiplier(1.3)).toBe("×1,3");
    expect(formatMultiplier(1)).toBe("×1");
  });
});

describe("formati rezervacije", () => {
  it("vrijeme po zoni kluba", () => {
    expect(formatTime("2026-11-14T22:00:00.000Z", "Europe/Zagreb")).toBe("23:00");
  });

  it("kod u dvije skupine", () => {
    expect(formatReservationCode("ABCD2345")).toBe("ABCD 2345");
  });

  it("odbrojavanje", () => {
    expect(formatCountdown(600_000)).toBe("10:00");
    expect(formatCountdown(65_400)).toBe("1:06");
    expect(formatCountdown(-5)).toBe("0:00");
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
