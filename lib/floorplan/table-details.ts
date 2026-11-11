import type { TableAvailability } from "../domain/table-status";
import type { Event, Floor, Table, VenuePolicy, Zone } from "../domain/types";
import { calculateTablePrice, type TablePrice } from "../pricing";

/** Sve što panel stola prikazuje, izračunato izvan UI-ja. */
export interface TableDetails {
  tableId: string;
  label: string;
  zoneName: string;
  zoneColor: string;
  floorName: string;
  capacity: number;
  availability: TableAvailability;
  /** null ako nema termina (tada nema ni cijene). */
  price: TablePrice | null;
  freeCancellationHours: number;
}

export function buildTableDetails(input: {
  table: Table;
  zones: readonly Zone[];
  floors: readonly Floor[];
  event: Pick<Event, "priceMultiplier"> | null;
  availability: Readonly<Record<string, TableAvailability>>;
  policy: VenuePolicy;
}): TableDetails {
  const { table, event, policy } = input;
  const zone = input.zones.find((candidate) => candidate.id === table.zoneId);
  if (!zone) throw new Error(`Nepoznata zona stola ${table.id}`);
  const floor = input.floors.find((candidate) => candidate.id === table.floorId);
  return {
    tableId: table.id,
    label: table.label,
    zoneName: zone.name,
    zoneColor: zone.color,
    floorName: floor?.name ?? "",
    capacity: table.capacity,
    availability: input.availability[table.id] ?? "free",
    price: event ? calculateTablePrice(zone, event) : null,
    freeCancellationHours: policy.freeCancellationHours,
  };
}
