import type { TableAvailability } from "../domain/table-status";

/** Boje statusa stola (zeleno slobodan, žuto držan, crveno zauzet) — iste za sve klubove. */
export const AVAILABILITY_COLORS: Readonly<Record<TableAvailability, string>> = {
  free: "#22c55e",
  held: "#eab308",
  booked: "#ef4444",
};

export const AVAILABILITY_ORDER: readonly TableAvailability[] = ["free", "held", "booked"];
