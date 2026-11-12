import { computeTableAvailability, type TableAvailability } from "../domain/table-status";
import type {
  Decoration,
  Event,
  Floor,
  PaymentAttempt,
  PaymentResult,
  PublicVenue,
  Reservation,
  Table,
  Venue,
  VenueData,
  Zone,
} from "../domain/types";
import {
  allowedStaffActions,
  checkIn,
  createStaffReservation,
  markNoShow,
  staffCancel,
  StaffReservationRequestSchema,
  type StaffActions,
} from "../reservations/staff";
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
  venue: PublicVenue;
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
  venue: PublicVenue;
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
  venue: PublicVenue;
  event: Event;
  table: Table;
  zone: Zone;
  floor: Floor;
  /** Akcije koje osoblje trenutno smije (prikazuju se samo uz sesiju osoblja). */
  staffActions: StaffActions;
}

export interface StaffReservationRow {
  reservation: Reservation;
  table: Table;
  zone: Zone;
  floor: Floor;
  actions: StaffActions;
}

export interface EventReservations {
  event: Event;
  rows: StaffReservationRow[];
  counts: { reserved: number; arrived: number; expected: number; held: number; noShow: number };
}

export type StaffActionResult =
  | { ok: true; reservation: Reservation }
  | {
      ok: false;
      error: "not_found" | "already_checked_in" | "not_confirmed" | "outside_window" | "too_early" | "not_cancellable";
    };

/** Klub bez tajnih polja (adminPinHash ostaje na serveru). */
export function toPublicVenue(venue: Venue): PublicVenue {
  const copy: Partial<Venue> & PublicVenue = { ...venue };
  delete copy.adminPinHash;
  return copy;
}

export type RequestField = "partySize" | "guestName" | "guestPhone";
export type StaffRequestField = RequestField | "kind";

export type CreateReservationResult =
  | { ok: true; code: string }
  | { ok: false; error: "invalid"; fields: RequestField[] }
  | { ok: false; error: "not_found" | HoldError };

export type ReservationActionResult =
  | { ok: true; reservation: Reservation }
  | { ok: false; error: "not_found" | PaymentError | "not_held" };

const REQUEST_FIELDS: readonly RequestField[] = ["partySize", "guestName", "guestPhone"];
const STAFF_REQUEST_FIELDS: readonly StaffRequestField[] = ["partySize", "guestName", "guestPhone", "kind"];

const naturalLabel = new Intl.Collator("hr", { numeric: true });

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


  function staffUpdate(
    slug: string,
    code: string,
    apply: (
      reservation: Reservation,
      event: Event,
      now: Date,
    ) => { ok: true; value: Reservation } | { ok: false; error: Exclude<StaffActionResult, { ok: true }>["error"] },
  ): StaffActionResult {
    const data = refreshed(slug);
    const reservation = data?.reservations.find((candidate) => candidate.code === code);
    const event = reservation && data?.events.find((candidate) => candidate.id === reservation.eventId);
    if (!data || !reservation || !event) return { ok: false, error: "not_found" };
    const result = apply(reservation, event, deps.now());
    if (!result.ok) return result;
    replaceReservation(data, result.value);
    return { ok: true, reservation: result.value };
  }

  return {
    async listVenueSlugs(): Promise<string[]> {
      return [...venues.keys()];
    },

    async getVenue(slug: string): Promise<PublicVenue | null> {
      const venue = venues.get(slug)?.venue;
      return venue ? toPublicVenue(venue) : null;
    },

    /** Samo za prijavu osoblja; nikad se ne šalje u preglednik. */
    async getAdminPinHash(slug: string): Promise<string | null> {
      return venues.get(slug)?.venue.adminPinHash ?? null;
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
        venue: toPublicVenue(data.venue),
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
        venue: toPublicVenue(data.venue),
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
      return {
        reservation,
        venue: toPublicVenue(data.venue),
        event,
        ...found,
        staffActions: allowedStaffActions(reservation, event, deps.now()),
      };
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
        method: "demo",
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


    /** Rezervacije termina za osoblje (bez otkazanih), poredane po stolu. */
    async listEventReservations(slug: string, date: string): Promise<EventReservations | null> {
      const data = refreshed(slug);
      const event = data?.events.find((candidate) => candidate.date === date);
      if (!data || !event) return null;
      const now = deps.now();
      const rows: StaffReservationRow[] = [];
      for (const reservation of data.reservations) {
        if (reservation.eventId !== event.id || reservation.status === "cancelled") continue;
        const found = lookupTable(data, reservation.tableId);
        if (found) rows.push({ reservation, ...found, actions: allowedStaffActions(reservation, event, now) });
      }
      rows.sort((a, b) => naturalLabel.compare(a.table.label, b.table.label));
      const count = (...statuses: Reservation["status"][]): number =>
        rows.filter((row) => statuses.includes(row.reservation.status)).length;
      return {
        event,
        rows,
        counts: {
          reserved: count("paid", "confirmed", "checked_in"),
          arrived: count("checked_in"),
          expected: count("paid", "confirmed"),
          held: count("held"),
          noShow: count("no_show"),
        },
      };
    },

    async staffCheckIn(slug: string, code: string): Promise<StaffActionResult> {
      return staffUpdate(slug, code, (reservation, event, now) => checkIn(reservation, event, now));
    },

    async staffNoShow(slug: string, code: string): Promise<StaffActionResult> {
      return staffUpdate(slug, code, (reservation, event, now) => markNoShow(reservation, event, now));
    },

    async staffCancel(slug: string, code: string): Promise<StaffActionResult> {
      return staffUpdate(slug, code, (reservation, _event, now) => staffCancel(reservation, now));
    },

    /** Ručna rezervacija osoblja (pravilo 8). */
    async staffCreateReservation(
      slug: string,
      input: unknown,
    ): Promise<
      | { ok: true; code: string }
      | { ok: false; error: "invalid"; fields: StaffRequestField[] }
      | { ok: false; error: "not_found" | HoldError }
    > {
      const parsed = StaffReservationRequestSchema.safeParse(input);
      if (!parsed.success) {
        const fields = STAFF_REQUEST_FIELDS.filter((field) =>
          parsed.error.issues.some((issue) => issue.message === field || issue.path[0] === field),
        );
        return fields.length > 0 ? { ok: false, error: "invalid", fields } : { ok: false, error: "not_found" };
      }
      const data = refreshed(slug);
      if (!data) return { ok: false, error: "not_found" };
      const found = lookupTable(data, parsed.data.tableId);
      const event = data.events.find((candidate) => candidate.date === parsed.data.date);
      if (!found || !event) return { ok: false, error: "not_found" };
      const code = uniqueCode();
      const now = deps.now();
      const result = createStaffReservation({
        id: `${data.venue.id}-rsv-${code.toLowerCase()}`,
        code,
        request: parsed.data,
        table: found.table,
        zone: found.zone,
        event,
        existing: data.reservations,
        now,
      });
      if (!result.ok) return result;
      data.reservations.push(result.value);
      if (result.value.status === "confirmed") {
        paymentSequence += 1;
        data.paymentAttempts.push({
          id: `${data.venue.id}-pay-${paymentSequence}`,
          venueId: data.venue.id,
          reservationId: result.value.id,
          amountCents: result.value.depositCents,
          method: "venue",
          result: "succeeded",
          createdAt: now.toISOString(),
        });
      }
      return { ok: true, code };
    },

    /** Samo za testove i provjere: kopija trenutnog stanja kluba. */
    async snapshot(slug: string): Promise<VenueData | null> {
      const data = refreshed(slug);
      return data ? structuredClone(data) : null;
    },
  };
}

export type Services = ReturnType<typeof createMemoryServices>;
