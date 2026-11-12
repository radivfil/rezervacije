import { describe, expect, it } from "vitest";
import { qrSvg } from "./qr";

describe("qrSvg", () => {
  it("vraća SVG bez naziva proizvoda", async () => {
    const svg = await qrSvg("https://demo.hr/k/demo-club/r/ABCD2345");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.toLowerCase()).not.toContain("sova");
  });
});
