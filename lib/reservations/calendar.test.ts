import { describe, expect, it } from "vitest";
import { buildIcs, icsDataUri } from "./calendar";

const entry = {
  uid: "ABCD2345@demo-club",
  title: "Glow Night · stol P3",
  location: "Demo Club",
  description: "Kod: ABCD 2345\nStol P3, Premium; 4 osobe",
  startsAt: "2026-11-28T22:00:00.000Z",
  durationHours: 5,
  createdAt: "2026-11-17T10:00:00.000Z",
  url: "https://example.test/k/demo-club/r/ABCD2345",
};

describe("kalendarski zapis rezervacije", () => {
  it("sadrži početak i kraj u UTC-u", () => {
    const ics = buildIcs(entry);
    expect(ics).toContain("DTSTART:20261128T220000Z");
    expect(ics).toContain("DTEND:20261129T030000Z");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapea zareze, točku-zarez i nove retke", () => {
    const ics = buildIcs(entry);
    expect(ics).toContain("DESCRIPTION:Kod: ABCD 2345\\nStol P3\\, Premium\\; 4 osobe");
  });

  it("ne sadrži naziv proizvoda", () => {
    expect(buildIcs(entry).toLowerCase()).not.toContain("sova");
  });

  it("data URI je preuzimljiv text/calendar", () => {
    expect(icsDataUri(entry).startsWith("data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR")).toBe(true);
  });

  it("odbija neispravno vrijeme", () => {
    expect(() => buildIcs({ ...entry, startsAt: "nije-datum" })).toThrow();
  });
});
