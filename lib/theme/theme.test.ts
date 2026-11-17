import { describe, expect, it } from "vitest";
import { DEMO_CLUB, DEMO_CLUB_2 } from "../seed/venues";
import { isDarkTheme, luminance, readableTextOn, statusPalette, themeToCssVars, withAlpha } from "./index";

describe("themeToCssVars", () => {
  it("mapira boje i font kluba u CSS varijable", () => {
    const vars = themeToCssVars(DEMO_CLUB.venue.theme);
    expect(vars["--brand-primary"]).toBe("#7c3aed");
    expect(vars["--brand-background"]).toBe("#0b0a14");
    expect(vars["--brand-font"]).toMatch(/^var\(--font-archivo\)/);
    expect(vars["--brand-display-transform"]).toBe("uppercase");
    expect(vars["--brand-scheme"]).toBe("dark");
  });

  it("drugi klub daje drugačije varijable", () => {
    const second = themeToCssVars(DEMO_CLUB_2.venue.theme);
    expect(second["--brand-font"]).toMatch(/^var\(--font-playfair\)/);
    expect(second["--brand-body"]).toMatch(/^var\(--font-archivo\)/);
    expect(second["--brand-scheme"]).toBe("light");
    expect(second).not.toEqual(themeToCssVars(DEMO_CLUB.venue.theme));
  });

  it("boje statusa prate svjetlinu podloge", () => {
    expect(isDarkTheme(DEMO_CLUB.venue.theme)).toBe(true);
    expect(isDarkTheme(DEMO_CLUB_2.venue.theme)).toBe(false);
    expect(statusPalette(DEMO_CLUB.venue.theme)).not.toEqual(statusPalette(DEMO_CLUB_2.venue.theme));
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

  it("withAlpha daje rgba", () => {
    expect(withAlpha("#ff0080", 0.5)).toBe("rgba(255, 0, 128, 0.5)");
  });
});
