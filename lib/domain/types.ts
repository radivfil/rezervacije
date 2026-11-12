import type { z } from "zod";
import type {
  CancelReasonSchema,
  DecorationKindSchema,
  DecorationSchema,
  EventKindSchema,
  EventSchema,
  FloorSchema,
  PaymentAttemptSchema,
  PaymentMethodSchema,
  PaymentResultSchema,
  ReservationSourceSchema,
  PromoterSchema,
  ReservationSchema,
  ReservationStatusSchema,
  TableSchema,
  TableShapeSchema,
  VenuePolicySchema,
  VenueSchema,
  VenueThemeSchema,
  ZoneSchema,
} from "./schemas";
import type { VenueDataSchema } from "./venue-data";

export type VenueTheme = z.infer<typeof VenueThemeSchema>;
export type VenuePolicy = z.infer<typeof VenuePolicySchema>;
export type Venue = z.infer<typeof VenueSchema>;
export type Floor = z.infer<typeof FloorSchema>;
export type Zone = z.infer<typeof ZoneSchema>;
export type TableShape = z.infer<typeof TableShapeSchema>;
export type Table = z.infer<typeof TableSchema>;
export type DecorationKind = z.infer<typeof DecorationKindSchema>;
export type Decoration = z.infer<typeof DecorationSchema>;
export type EventKind = z.infer<typeof EventKindSchema>;
export type Event = z.infer<typeof EventSchema>;
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type Promoter = z.infer<typeof PromoterSchema>;
export type CancelReason = z.infer<typeof CancelReasonSchema>;
export type PaymentResult = z.infer<typeof PaymentResultSchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type ReservationSource = z.infer<typeof ReservationSourceSchema>;
/** Klub bez tajnih polja: smije se slati u preglednik. */
export type PublicVenue = Omit<Venue, "adminPinHash">;
export type PaymentAttempt = z.infer<typeof PaymentAttemptSchema>;
export type VenueData = z.infer<typeof VenueDataSchema>;
