import { describe, expect, it } from "vitest";
import { DATE_PARAM, venueDateHref } from "./routes";

describe("venueDateHref", () => {
  it("dodaje datum kao query parametar", () => {
    expect(DATE_PARAM).toBe("datum");
    expect(venueDateHref("/k/demo-club", "2026-11-14")).toBe("/k/demo-club?datum=2026-11-14");
  });
});
