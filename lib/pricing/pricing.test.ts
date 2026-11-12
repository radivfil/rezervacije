import { describe, expect, it } from "vitest";
import { calculateTablePrice, multiplierForDate, PRICE_MULTIPLIERS, weekdayOf } from "./index";

describe("multiplierForDate", () => {
  // 2026-11-12 je četvrtak.
  it.each([
    ["2026-11-12", 0.6],
    ["2026-11-13", 1],
    ["2026-11-14", 1.3],
  ])("%s -> %s", (date, expected) => {
    expect(multiplierForDate(date)).toBe(expected);
  });

  it.each(["2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18"])(
    "%s (ned-sri) nema redovni termin",
    (date) => {
      expect(multiplierForDate(date)).toBeNull();
    },
  );

  it("posebni event je 1.5 bez obzira na dan", () => {
    expect(multiplierForDate("2026-11-12", { special: true })).toBe(1.5);
    expect(multiplierForDate("2026-11-14", { special: true })).toBe(1.5);
    expect(multiplierForDate("2026-11-17", { special: true })).toBe(1.5);
  });

  it("dan u tjednu ne ovisi o vremenskoj zoni", () => {
    expect(weekdayOf("2026-11-12")).toBe(4);
    expect(weekdayOf("2027-01-01")).toBe(5);
  });

  it("odbija neispravan datum", () => {
    expect(() => weekdayOf("nije-datum")).toThrow();
  });
});

describe("calculateTablePrice", () => {
  const standard = { minSpend: 150, depositPercent: 30 };

  it("osnovni termin (petak): cijena = minSpend, akontacija 30%", () => {
    expect(calculateTablePrice(standard, { priceMultiplier: PRICE_MULTIPLIERS.friday })).toEqual({
      minSpendCents: 15000,
      depositCents: 4500,
      remainingCents: 10500,
      depositPercent: 30,
      multiplier: 1,
    });
  });

  it("četvrtak 0.6", () => {
    const price = calculateTablePrice(standard, { priceMultiplier: 0.6 });
    expect(price.minSpendCents).toBe(9000);
    expect(price.depositCents).toBe(2700);
  });

  it("subota 1.3 bez grešaka pomičnog zareza", () => {
    const price = calculateTablePrice(standard, { priceMultiplier: 1.3 });
    expect(price.minSpendCents).toBe(19500);
    expect(price.depositCents).toBe(5850);
  });

  it("event 1.5", () => {
    const price = calculateTablePrice({ minSpend: 1000, depositPercent: 30 }, { priceMultiplier: 1.5 });
    expect(price.minSpendCents).toBe(150000);
    expect(price.depositCents).toBe(45000);
  });

  it.each([
    [150, 0.6, 9000, 2700],
    [300, 1.3, 39000, 11700],
    [800, 1.3, 104000, 31200],
    [250, 0.6, 15000, 4500],
    [500, 1.5, 75000, 22500],
  ])("minSpend %s x %s = %s c, akontacija %s c", (minSpend, multiplier, cents, deposit) => {
    const price = calculateTablePrice({ minSpend, depositPercent: 30 }, { priceMultiplier: multiplier });
    expect(price.minSpendCents).toBe(cents);
    expect(price.depositCents).toBe(deposit);
  });

  it("akontacija se uračunava: akontacija + ostatak = min. potrošnja", () => {
    for (const multiplier of [0.6, 1, 1.3, 1.5]) {
      for (const minSpend of [150, 250, 300, 500, 800, 1000, 1]) {
        const price = calculateTablePrice({ minSpend, depositPercent: 33 }, { priceMultiplier: multiplier });
        expect(price.depositCents + price.remainingCents).toBe(price.minSpendCents);
      }
    }
  });

  it("zaokružuje akontaciju na cent", () => {
    const price = calculateTablePrice({ minSpend: 1, depositPercent: 33 }, { priceMultiplier: 1.3 });
    expect(price.minSpendCents).toBe(130);
    expect(price.depositCents).toBe(43);
  });

  it("odbija nepozitivan množitelj", () => {
    expect(() => calculateTablePrice(standard, { priceMultiplier: 0 })).toThrow();
  });
});
