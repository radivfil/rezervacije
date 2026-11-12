import { describe, expect, it } from "vitest";
import { hashPin, verifyPin } from "./pin";

describe("PIN osoblja", () => {
  it("hash je SHA-256 heks", () => {
    expect(hashPin("1234")).toBe("03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4");
  });

  it("provjera ispravnog i pogrešnog PIN-a", () => {
    const hash = hashPin("1234");
    expect(verifyPin("1234", hash)).toBe(true);
    expect(verifyPin("1235", hash)).toBe(false);
    expect(verifyPin("", hash)).toBe(false);
    expect(verifyPin("1234", "nije-hash")).toBe(false);
  });
});
