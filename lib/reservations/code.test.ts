import { describe, expect, it } from "vitest";
import { ReservationCodeSchema, RESERVATION_CODE_ALPHABET } from "../domain/schemas";
import { cryptoRandomIndex, generateReservationCode } from "./code";

describe("generateReservationCode", () => {
  it("daje 8 znakova bez 0/O/1/I/L", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateReservationCode();
      expect(ReservationCodeSchema.safeParse(code).success).toBe(true);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("koristi injektirani izvor slučajnosti", () => {
    expect(generateReservationCode(() => 0)).toBe("22222222");
    expect(generateReservationCode((max) => max - 1)).toBe("ZZZZZZZZ");
  });

  it("kodovi su praktički jedinstveni", () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateReservationCode()));
    expect(codes.size).toBe(2000);
  });

  it("cryptoRandomIndex ostaje u granicama", () => {
    for (let i = 0; i < 500; i += 1) {
      const value = cryptoRandomIndex(RESERVATION_CODE_ALPHABET.length);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(RESERVATION_CODE_ALPHABET.length);
    }
  });
});
