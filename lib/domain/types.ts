import type { z } from "zod";
import type {
  DecorationKindSchema,
  DecorationSchema,
  EventKindSchema,
  EventSchema,
  FloorSchema,
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
export type VenueData = z.infer<typeof VenueDataSchema>;
