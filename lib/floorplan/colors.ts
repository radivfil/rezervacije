import type { TableAvailability } from "../domain/table-status";

/** CSS varijable boja statusa (postavlja ih tema kluba, vidi lib/theme). */
export const AVAILABILITY_CSS_VARS: Readonly<Record<TableAvailability, string>> = {
  free: "var(--status-free)",
  held: "var(--status-held)",
  booked: "var(--status-booked)",
};

export const AVAILABILITY_ORDER: readonly TableAvailability[] = ["free", "held", "booked"];
