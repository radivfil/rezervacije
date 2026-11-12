import type { PaymentResult } from "../domain/types";
import { services } from "./instance";
import type { CreateReservationResult, RequestField, ReservationActionResult, ReservationView } from "./memory";

/** Pristup rezervacijama za UI i Server Actions. */
export type { CreateReservationResult, RequestField, ReservationActionResult, ReservationView };

export function createReservation(slug: string, input: unknown): Promise<CreateReservationResult> {
  return services().createReservation(slug, input);
}

export function getReservation(slug: string, code: string): Promise<ReservationView | null> {
  return services().getReservation(slug, code);
}

export function payReservation(slug: string, code: string, outcome: PaymentResult): Promise<ReservationActionResult> {
  return services().payReservation(slug, code, outcome);
}

export function abandonReservation(slug: string, code: string): Promise<ReservationActionResult> {
  return services().abandonReservation(slug, code);
}
