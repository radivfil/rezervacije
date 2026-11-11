import demoClub from "../../data/venues/demo-club.json";
import demoClub2 from "../../data/venues/demo-club-2.json";
import { computeTableAvailability, type TableAvailability } from "../domain/table-status";
import type { Decoration, Event, Floor, Table, Venue, VenueData, Zone } from "../domain/types";
import { VenueDataSchema } from "../domain/venue-data";

/**
 * Jedini pristup podacima za UI. Zasad čita JSON iz /data/venues,
 * kasnije se zamjenjuje Supabaseom uz isti potpis funkcija.
 */
const RAW_VENUES: readonly unknown[] = [demoClub, demoClub2];

let cache: ReadonlyMap<string, VenueData> | null = null;

function loadVenues(): ReadonlyMap<string, VenueData> {
  if (!cache) {
    const entries = RAW_VENUES.map((raw) => {
      const data = VenueDataSchema.parse(raw);
      return [data.venue.slug, data] as const;
    });
    cache = new Map(entries);
  }
  return cache;
}

export async function listVenueSlugs(): Promise<string[]> {
  return [...loadVenues().keys()];
}

export async function getVenue(slug: string): Promise<Venue | null> {
  return loadVenues().get(slug)?.venue ?? null;
}

export async function listEvents(slug: string): Promise<Event[]> {
  const data = loadVenues().get(slug);
  if (!data) return [];
  return [...data.events].sort((a, b) => a.date.localeCompare(b.date));
}

export interface FloorplanData {
  venue: Venue;
  events: Event[];
  floors: Floor[];
  zones: Zone[];
  tables: Table[];
  decorations: Decoration[];
  event: Event | null;
  availability: Record<string, TableAvailability>;
}

/**
 * Tlocrt kluba sa statusima stolova za termin.
 * Redoslijed odabira termina: `eventId`, termin na točno `date` (samo od `fromDate`),
 * prvi termin na ili nakon `fromDate` (YYYY-MM-DD), inače prvi termin.
 */
export async function getFloorplan(
  slug: string,
  options: { eventId?: string; date?: string; fromDate?: string } = {},
): Promise<FloorplanData | null> {
  const data = loadVenues().get(slug);
  if (!data) return null;
  const events = await listEvents(slug);
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
    availability: event
      ? computeTableAvailability(data.tables, data.reservations, event.id)
      : Object.fromEntries(data.tables.map((table) => [table.id, "free" as const])),
  };
}
