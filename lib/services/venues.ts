import type { Event, Venue } from "../domain/types";
import { services } from "./instance";
import type { BookingContext, FloorplanData } from "./memory";

/**
 * Jedini pristup podacima klubova za UI. Zasad memorija servera nad /data/venues,
 * kasnije Supabase uz isti potpis funkcija.
 */
export type { BookingContext, FloorplanData };

export function listVenueSlugs(): Promise<string[]> {
  return services().listVenueSlugs();
}

export function getVenue(slug: string): Promise<Venue | null> {
  return services().getVenue(slug);
}

export function listEvents(slug: string): Promise<Event[]> {
  return services().listEvents(slug);
}

export function getFloorplan(
  slug: string,
  options: { eventId?: string; date?: string; fromDate?: string } = {},
): Promise<FloorplanData | null> {
  return services().getFloorplan(slug, options);
}

export function getBookingContext(slug: string, tableId: string, date: string): Promise<BookingContext | null> {
  return services().getBookingContext(slug, tableId, date);
}
