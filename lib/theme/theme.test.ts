import { describe, expect, it } from "vitest";
import { DEMO_CLUB, DEMO_CLUB_2 } from "../seed/venues";
import { luminance, readableTextOn, themeToCssVars } from "./index";

describe("themeToCssVars", () => {
  it("mapira boje i font kluba u CSS varijable", () => {
    const vars = themeToCssVars(DEMO_CLUB.venue.theme);
    expect(vars["--brand-primary"]).toBe("#7c3aed");
    expect(vars["--brand-background"]).toBe("#0b0a14");
    expect(vars["--brand-font"]).toMatch(/^var\(--font-inter\)/);
  });

  it("drugi klub daje drugačije varijable", () => {
    const second = themeToCssVars(DEMO_CLUB_2.venue.theme);
    expect(second["--brand-font"]).toMatch(/^var\(--font-playfair\)/);
    expect(second).not.toEqual(themeToCssVars(DEMO_CLUB.venue.theme));
  });
});

describe("kontrast", () => {
  it("luminancija crne i bijele", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
  });

  it("bira čitljivu boju teksta", () => {
    expect(readableTextOn("#7c3aed")).toBe("#ffffff");
    expect(readableTextOn("#fdf8f0")).toBe("#000000");
  });
});
