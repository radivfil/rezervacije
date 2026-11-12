import { describe, expect, it } from "vitest";
import { absoluteUrl, adminHref, bookingHref, DATE_PARAM, reservationHref, venueDateHref, venueHref } from "./routes";

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name] ?? null });

describe("rute", () => {
  it("tlocrt s datumom", () => {
    expect(DATE_PARAM).toBe("datum");
    expect(venueHref("demo-club")).toBe("/k/demo-club");
    expect(venueDateHref("/k/demo-club", "2026-11-14")).toBe("/k/demo-club?datum=2026-11-14");
  });

  it("forma rezervacije i potvrda", () => {
    expect(bookingHref("demo-club", "demo-club-vip-01", "2026-11-14")).toBe(
      "/k/demo-club/rezerviraj?stol=demo-club-vip-01&datum=2026-11-14",
    );
    expect(reservationHref("demo-club", "ABCD2345")).toBe("/k/demo-club/r/ABCD2345");
    expect(adminHref("demo-club")).toBe("/k/demo-club/admin");
  });

  it("apsolutni URL iz zaglavlja", () => {
    expect(absoluteUrl(headers({ host: "localhost:3000" }), "/k/x")).toBe("http://localhost:3000/k/x");
    expect(absoluteUrl(headers({ host: "klub.hr" }), "/k/x")).toBe("https://klub.hr/k/x");
    expect(absoluteUrl(headers({ host: "a", "x-forwarded-host": "demo.hr", "x-forwarded-proto": "https, http" }), "/r")).toBe(
      "https://demo.hr/r",
    );
  });
});
