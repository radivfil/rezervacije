import { computeTableAvailability, type TableAvailability } from "../domain/table-status";
import type {
  Decoration,
  Event,
  Floor,
  PaymentAttempt,
  PaymentResult,
  Reservation,
  Table,
  Venue,
  VenueData,
  Zone,
} from "../domain/types";
import { VenueDataSchema } from "../domain/venue-data";
import { calculateTablePrice, type TablePrice } from "../pricing";
import {
  abandonHold,
  applyPayment,
  createHold,
  expireHold,
  hasEventStarted,
  ReservationRequestSchema,
  type HoldError,
  type PaymentError,
} from "../reservations/rules";

export interface ServiceDeps {
  now: () => Date;
  generateCode: () => string;
}

export interface FloorplanData {
  venue: Venue;
  events: Event[];
  floors: Floor[];
  zones: Zone[];
  tables: Table[];
  decorations: Decoration[];
  event: Event | null;
  /** Može li se za odabrani termin još rezervirati (termin nije počeo). */
  bookingOpen: boolean;
  availability: Record<string, TableAvailability>;
}

export interface BookingContext {
  venue: Venue;
  table: Table;
  zone: Zone;
  floor: Floor;
  event: Event;
  price: TablePrice;
  availability: TableAvailability;
  bookingOpen: boolean;
}

export interface ReservationView {
  reservation: Reservation;
  venue: Venue;
  event: Event;
  table: Table;
  zone: Zone;
  floor: Floor;
}

export type RequestField = "partySize" | "guestName" | "guestPhone";

export type CreateReservationResult =
  | { ok: true; code: string }
  | { ok: false; error: "invalid"; fields: RequestField[] }
  | { ok: false; error: "not_found" | HoldError };

export type ReservationActionResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: "not_found" | PaymentError | "not_held" };

const REQUEST_FIELDS: readonly RequestField[] = ["partySize", "guestName", "guestPhone"];

/**
 * Servisi nad podacima kluba s rezervacijama u memoriji servera.
 * Sva pisanja su sinkrona između čitanja i upisa (canvas 02, pravilo 7).
 */
export function createMemoryServices(rawVenues: readonly unknown[], deps: ServiceDeps) {
  const venues = new Map<string, VenueData>();
  for (const raw of rawVenues) {
    const data = VenueDataSchema.parse(raw);
    venues.set(data.venue.slug, structuredClone(data));
  }
  let paymentSequence = 0;

  /** Lijeni istek držanja za cijeli klub (pravilo 5). */
  function refreshed(slug: string): VenueData | undefined {
    const data = venues.get(slug);
    if (!data) return undefined;
    const now = deps.now();
    data.reservations = data.reservations.map((reservation) => expireHold(reservation, now));
    return data;
  }

  function sortedEvents(data: VenueData): Event[] {
    return [...data.events].sort((a, b) => a.date.localeCompare(b.date));
  }

  function lookupTable(data: VenueData, tableId: string) {
    const table = data.tables.find((candidate) => candidate.id === tableId);
    const zone = table && data.zones.find((candidate) => candidate.id === table.zoneId);
    const floor = table && data.floors.find((candidate) => candidate.id === table.floorId);
    return table && zone && floor ? { table, zone, floor } : null;
  }

  function uniqueCode(): string {
    const used = new Set([...venues.values()].flatMap((data) => data.reservations.map((reservation) => reservation.code)));
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = deps.generateCode();
      if (!used.has(code)) return code;
    }
    throw new Error("Nije moguće generirati jedinstven kod rezervacije");
  }

  function replaceReservation(data: VenueData, updated: Reservation): void {
    data.reservations = data.reservations.map((reservation) => (reservation.id === updated.id ? updated : reservation));
  }

  return {
    async listVenueSlugs(): Promise<string[]> {
      return [...venues.keys()];
    },

    async getVenue(slug: string): Promise<Venue | null> {
      return venues.get(slug)?.venue ?? null;
    },

    async listEvents(slug: string): Promise<Event[]> {
      const data = venues.get(slug);
      return data ? sortedEvents(data) : [];
    },

    /**
     * Tlocrt sa statusima stolova. Odabir termina: `eventId`, točno `date` (samo od `fromDate`),
     * prvi termin od `fromDate` (YYYY-MM-DD), inače prvi termin.
     */
    async getFloorplan(
      slug: string,
      options: { eventId?: string; date?: string; fromDate?: string } = {},
    ): Promise<FloorplanData | null> {
      const data = refreshed(slug);
      if (!data) return null;
      const events = sortedEvents(data);
      const { eventId, date, fromDate } = options;
      const upcoming = fromDate ? events.filter((candidate) => candidate.date >= fromDate) : events;
      const event =
        (eventId ? events.find((candidate) => candidate.id === eventId) : undefined) ??
        (date ? upcoming.find((candidate) => candidate.date === date) : undefined) ??
        upcoming[0] ??
        events[0] ??
        null;

      return {
        venue: data.venue,
        events: upcoming,
        floors: [...data.floors].sort((a, b) => a.order - b.order),
        zones: data.zones,
        tables: data.tables,
        decorations: data.decorations,
        event,
        bookingOpen: event ? !hasEventStarted(event, deps.now()) : false,
        availability: event
          ? computeTableAvailability(data.tables, data.reservations, event.id)
          : Object.fromEntries(data.tables.map((table) => [table.id, "free" as const])),
      };
    },

    /** Podaci za formu rezervacije; null ako stol ili termin ne postoje. */
    async getBookingContext(slug: string, tableId: string, date: string): Promise<BookingContext | null> {
      const data = refreshed(slug);
      if (!data) return null;
      const found = lookupTable(data, tableId);
      const event = data.events.find((candidate) => candidate.date === date);
      if (!found || !event) return null;
      const availability = computeTableAvailability([found.table], data.reservations, event.id)[found.table.id] ?? "free";
      return {
        venue: data.venue,
        ...found,
        event,
        price: calculateTablePrice(found.zone, event),
        availability,
        bookingOpen: !hasEventStarted(event, deps.now()),
      };
    },

    /** Gost stvara držanje (pravila 1-4, 7). Ulaz se validira ovdje. */
    async createReservation(slug: string, input: unknown): Promise<CreateReservationResult> {
      const parsed = ReservationRequestSchema.safeParse(input);
      if (!parsed.success) {
        const fields = REQUEST_FIELDS.filter((field) => parsed.error.issues.some((issue) => issue.message === field));
        return fields.length > 0 ? { ok: false, error: "invalid", fields } : { ok: false, error: "not_found" };
      }
      const data = refreshed(slug);
      if (!data) return { ok: false, error: "not_found" };
      const found = lookupTable(data, parsed.data.tableId);
      const event = data.events.find((candidate) => candidate.date === parsed.data.date);
      if (!found || !event) return { ok: false, error: "not_found" };

      const code = uniqueCode();
      const result = createHold({
        id: `${data.venue.id}-rsv-${code.toLowerCase()}`,
        code,
        request: parsed.data,
        table: found.table,
        zone: found.zone,
        event,
        policy: data.venue.policy,
        existing: data.reservations,
        now: deps.now(),
      });
      if (!result.ok) return result;
      data.reservations.push(result.value);
      return { ok: true, code };
    },

    async getReservation(slug: string, code: string): Promise<ReservationView | null> {
      const data = refreshed(slug);
      const reservation = data?.reservations.find((candidate) => candidate.code === code);
      if (!data || !reservation) return null;
      const found = lookupTable(data, reservation.tableId);
      const event = data.events.find((candidate) => candidate.id === reservation.eventId);
      if (!found || !event) return null;
      return { reservation, venue: data.venue, event, ...found };
    },

    /** Demo plaćanje akontacije (pravilo 6); svaki pokušaj se bilježi. */
    async payReservation(slug: string, code: string, outcome: PaymentResult): Promise<ReservationActionResult> {
      const data = refreshed(slug);
      const reservation = data?.reservations.find((candidate) => candidate.code === code);
      if (!data || !reservation) return { ok: false, error: "not_found" };
      const now = deps.now();
      const result = applyPayment(reservation, outcome, now);
      if (!result.ok) return result;
      paymentSequence += 1;
      const attempt: PaymentAttempt = {
        id: `${data.venue.id}-pay-${paymentSequence}`,
        venueId: data.venue.id,
        reservationId: reservation.id,
        amountCents: reservation.depositCents,
        result: outcome,
        createdAt: now.toISOString(),
      };
      data.paymentAttempts.push(attempt);
      replaceReservation(data, result.value);
      return { ok: true, reservation: result.value };
    },

    async abandonReservation(slug: string, code: string): Promise<ReservationActionResult> {
      const data = refreshed(slug);
      const reservation = data?.reservations.find((candidate) => candidate.code === code);
      if (!data || !reservation) return { ok: false, error: "not_found" };
      const result = abandonHold(reservation, deps.now());
      if (!result.ok) return result;
      replaceReservation(data, result.value);
      return { ok: true, reservation: result.value };
    },

    /** Samo za testove i provjere: kopija trenutnog stanja kluba. */
    async snapshot(slug: string): Promise<VenueData | null> {
      const data = refreshed(slug);
      return data ? structuredClone(data) : null;
    },
  };
}

export type Services = ReturnType<typeof createMemoryServices>;
