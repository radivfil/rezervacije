import { describe, expect, it } from "vitest";
import { normalizeCodeInput } from "./form-state";

describe("normalizeCodeInput", () => {
  it("uklanja razmake i crtice, velika slova", () => {
    expect(normalizeCodeInput(" abcd 2345 ")).toBe("ABCD2345");
    expect(normalizeCodeInput("ABCD-2345")).toBe("ABCD2345");
  });
});
