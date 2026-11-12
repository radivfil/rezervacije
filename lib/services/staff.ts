import { services } from "./instance";
import type { EventReservations, StaffActionResult, StaffRequestField, StaffReservationRow } from "./memory";

/** Pristup podacima za osoblje. Pozivatelj mora prethodno provjeriti sesiju osoblja. */
export type { EventReservations, StaffActionResult, StaffRequestField, StaffReservationRow };

export function listEventReservations(slug: string, date: string): Promise<EventReservations | null> {
  return services().listEventReservations(slug, date);
}

export function staffCheckIn(slug: string, code: string): Promise<StaffActionResult> {
  return services().staffCheckIn(slug, code);
}

export function staffNoShow(slug: string, code: string): Promise<StaffActionResult> {
  return services().staffNoShow(slug, code);
}

export function staffCancel(slug: string, code: string): Promise<StaffActionResult> {
  return services().staffCancel(slug, code);
}

export function staffCreateReservation(slug: string, input: unknown) {
  return services().staffCreateReservation(slug, input);
}
