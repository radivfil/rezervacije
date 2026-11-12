import { createHash, timingSafeEqual } from "node:crypto";

/** SHA-256 heks PIN-a (PIN se nikad ne sprema u čistom obliku). */
export function hashPin(pin: string): string {
  return createHash("sha256").update(pin, "utf8").digest("hex");
}

/** Vremenski konstantna usporedba PIN-a s pohranjenim hashom (pravilo 1). */
export function verifyPin(pin: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashPin(pin), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
