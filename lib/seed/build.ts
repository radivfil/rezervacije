import type {
  Decoration,
  Event,
  Floor,
  Promoter,
  Reservation,
  ReservationStatus,
  Table,
  VenueData,
  Zone,
} from "../domain/types";
import { tableEventKey } from "../domain/reservation-rules";
import { calculateTablePrice } from "../pricing";
import { generateReservationCode } from "../reservations/code";
import { VenueDataSchema } from "../domain/venue-data";
import { EVENT_START_TIME, generateEvents } from "./events";
import { DEFAULT_FLOORS, type FloorLayout } from "./layout";
import { createRandom, type Random } from "./random";
import type { VenueSeedConfig } from "./venues";

export const DEFAULT_DEPOSIT_PERCENT = 30;

export interface BuildOptions {
  /** Prvi dan generiranih termina (YYYY-MM-DD). */
  startDate: string;
  weeks?: number;
  floors?: readonly FloorLayout[];
}

/** Težine statusa nasumičnih rezervacija. */
const STATUS_WEIGHTS: readonly [ReservationStatus, number][] = [
  ["confirmed", 14],
  ["paid", 8],
  ["held", 8],
  ["cancelled", 5],
  ["checked_in", 3],
  ["no_show", 2],
];

function pickStatus(random: Random): ReservationStatus {
  const total = STATUS_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random.next() * total;
  for (const [status, weight] of STATUS_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return status;
  }
  return "confirmed";
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function buildLayout(venueId: string, floorLayouts: readonly FloorLayout[]) {
  const floors: Floor[] = [];
  const zones: Zone[] = [];
  const tables: Table[] = [];
  const decorations: Decoration[] = [];

  floorLayouts.forEach((layout, floorIndex) => {
    const floorId = `${venueId}-${layout.key}`;
    floors.push({ id: floorId, venueId, name: layout.name, order: floorIndex, width: layout.width, height: layout.height });

    layout.decorations.forEach((decoration, index) => {
      decorations.push({
        id: `${floorId}-dec-${pad(index + 1)}`,
        venueId,
        floorId,
        rotation: 0,
        ...decoration,
      });
    });

    for (const zoneLayout of layout.zones) {
      const zoneId = `${venueId}-${zoneLayout.key}`;
      zones.push({
        id: zoneId,
        venueId,
        floorId,
        name: zoneLayout.name,
        minSpend: zoneLayout.minSpend,
        depositPercent: DEFAULT_DEPOSIT_PERCENT,
        color: zoneLayout.color,
      });
      zoneLayout.positions.forEach((position, index) => {
        tables.push({
          id: `${zoneId}-${pad(index + 1)}`,
          venueId,
          floorId,
          zoneId,
          label: `${zoneLayout.labelPrefix}${index + 1}`,
          x: position.x,
          y: position.y,
          rotation: 0,
          width: zoneLayout.width,
          height: zoneLayout.height,
          shape: zoneLayout.shape,
          capacity: zoneLayout.capacity,
        });
      });
    }
  });

  return { floors, zones, tables, decorations };
}

function buildReservations(
  venueId: string,
  count: number,
  tables: readonly Table[],
  zones: readonly Zone[],
  events: readonly Event[],
  promoters: readonly Promoter[],
  random: Random,
): Reservation[] {
  const zonesById = new Map(zones.map((zone) => [zone.id, zone]));
  const codes = new Set<string>();
  const reservations: Reservation[] = [];
  const activeKeys = new Set<string>();
  const usedKeys = new Set<string>();
  const maxAttempts = count * 50;
  // Rezervacije su gušće u prvim tjednima.
  const nearEvents = events.slice(0, Math.max(1, Math.ceil(events.length / 2)));

  for (let attempt = 0; reservations.length < count && attempt < maxAttempts; attempt += 1) {
    const event = random.next() < 0.75 ? random.pick(nearEvents) : random.pick(events);
    const table = random.pick(tables);
    const key = tableEventKey({ tableId: table.id, eventId: event.id });
    if (usedKeys.has(key)) continue;
    const status = pickStatus(random);
    const isActive = status !== "cancelled" && status !== "no_show";
    if (isActive && activeKeys.has(key)) continue;
    usedKeys.add(key);
    if (isActive) activeKeys.add(key);

    const zone = zonesById.get(table.zoneId);
    if (!zone) throw new Error(`Nepoznata zona ${table.zoneId}`);
    const price = calculateTablePrice(zone, event);
    let code = generateReservationCode((max) => random.int(0, max - 1));
    while (codes.has(code)) code = generateReservationCode((max) => random.int(0, max - 1));
    codes.add(code);

    const eventStart = Date.parse(event.startsAt);
    const createdAt = new Date(eventStart - random.int(1, 14) * 86_400_000 - random.int(0, 23) * 3_600_000);
    const later = new Date(createdAt.getTime() + 5 * 60_000).toISOString();
    const reservation: Reservation = {
      id: `${venueId}-rsv-${String(reservations.length + 1).padStart(3, "0")}`,
      venueId,
      eventId: event.id,
      tableId: table.id,
      code,
      status,
      partySize: random.int(Math.min(2, table.capacity), table.capacity),
      minSpendCents: price.minSpendCents,
      depositCents: price.depositCents,
      createdAt: createdAt.toISOString(),
      source: "seed",
    };
    // Seed "held" = držanje kluba/promotora do početka termina (canvas 02, pravilo 8).
    if (status === "held") reservation.holdExpiresAt = event.startsAt;
    if (status === "paid" || status === "confirmed" || status === "checked_in" || status === "no_show") {
      reservation.paidAt = later;
    }
    if (status === "confirmed" || status === "checked_in" || status === "no_show") reservation.confirmedAt = later;
    if (status === "checked_in") reservation.checkedInAt = event.startsAt;
    if (status === "no_show") reservation.noShowAt = event.startsAt;
    if (status === "cancelled") {
      reservation.cancelledAt = later;
      reservation.cancelReason = "staff";
    }
    if (promoters.length > 0 && random.next() < 0.4) {
      reservation.promoterId = random.pick(promoters).id;
    }
    reservations.push(reservation);
  }

  if (reservations.length < count) {
    throw new Error(`Nije moguće generirati ${count} rezervacija bez preklapanja`);
  }
  return reservations;
}

/** Gradi i validira kompletne podatke jednog kluba. */
export function buildVenueData(config: VenueSeedConfig, options: BuildOptions): VenueData {
  const venueId = config.venue.id;
  const random = createRandom(config.randomSeed);
  const { floors, zones, tables, decorations } = buildLayout(venueId, options.floors ?? DEFAULT_FLOORS);
  const events = generateEvents(venueId, options.startDate, options.weeks ?? 8, {
    timeZone: config.venue.timezone,
    startTime: EVENT_START_TIME,
  });
  const promoters: Promoter[] = config.promoterNames.map((name, index) => ({
    id: `${venueId}-promo-${pad(index + 1)}`,
    venueId,
    name,
    code: `${name.split(" ").at(-1)?.toUpperCase().replace(/[^A-Z0-9]/g, "") ?? "PROMO"}${pad(index + 1)}`,
  }));
  const reservations = buildReservations(venueId, config.reservationCount, tables, zones, events, promoters, random);

  return VenueDataSchema.parse({
    venue: config.venue,
    floors,
    zones,
    tables,
    decorations,
    events,
    reservations,
    promoters,
    paymentAttempts: [],
  });
}
