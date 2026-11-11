import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildVenueData, SEED_VENUES } from "../lib/seed";

/**
 * Generira /data/venues/<slug>.json.
 * Upotreba: npm run seed [-- YYYY-MM-DD]  (zadano: današnji datum)
 */
function main(): void {
  const startDate = process.argv[2] ?? new Date().toISOString().slice(0, 10);
  const outDir = join(process.cwd(), "data", "venues");
  mkdirSync(outDir, { recursive: true });

  for (const config of SEED_VENUES) {
    const data = buildVenueData(config, { startDate });
    const file = join(outDir, `${config.venue.slug}.json`);
    writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(
      `${config.venue.slug}: ${data.floors.length} etaže, ${data.tables.length} stolova, ` +
        `${data.events.length} termina, ${data.reservations.length} rezervacija -> ${file}`,
    );
  }
}

main();
