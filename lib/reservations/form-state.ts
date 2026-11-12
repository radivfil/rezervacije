import type messages from "../../messages/hr.json";

/** Ključevi poruka za greške forme (messages.booking.errors). */
export type BookingErrorKey = keyof (typeof messages)["booking"]["errors"];
export type BookingField = "partySize" | "guestName" | "guestPhone";

export interface BookingFormState {
  error: BookingErrorKey | null;
  fields: BookingField[];
}

export const INITIAL_BOOKING_STATE: BookingFormState = { error: null, fields: [] };

export interface PaymentFormState {
  error: "payment_failed" | null;
}

export const INITIAL_PAYMENT_STATE: PaymentFormState = { error: null };
