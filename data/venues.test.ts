import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VenueDataSchema } from "../lib/domain/venue-data";

const dir = join(__dirname, "venues");
const files = readdirSync(dir).filter((file) => file.endsWith(".json"));

describe("/data/venues/*.json", () => {
  it("postoje oba demo kluba", () => {
    expect(files.sort()).toEqual(["demo-club-2.json", "demo-club.json"]);
  });

  it.each(files)("%s prolazi validaciju i slug odgovara imenu datoteke", (file) => {
    const data = VenueDataSchema.parse(JSON.parse(readFileSync(join(dir, file), "utf8")));
    expect(`${data.venue.slug}.json`).toBe(file);
    expect(data.tables).toHaveLength(90);
  });
});
