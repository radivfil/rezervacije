import { z } from "zod";
import { SUPPORTED_FONTS } from "../theme";

/** Identifikator entiteta: mala slova, brojevi i crtice. */
export const IdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "ID smije sadržavati mala slova, brojeve i crtice");

/** Datum kalendarskog dana u formatu YYYY-MM-DD (bez vremenske zone). */
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum mora biti u formatu YYYY-MM-DD")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Neispravan datum");

export const IsoDateTimeSchema = z.iso.datetime();

export const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Boja mora biti u formatu #RRGGBB");

export const VenueThemeSchema = z.object({
  logoUrl: z.string().min(1),
  colors: z.object({
    primary: HexColorSchema,
    accent: HexColorSchema,
    background: HexColorSchema,
    surface: HexColorSchema,
    text: HexColorSchema,
  }),
  fontFamily: z.enum(SUPPORTED_FONTS),
});

export const VenuePolicySchema = z.object({
  /** Do koliko sati prije početka termina gost može besplatno otkazati. */
  freeCancellationHours: z.number().int().nonnegative(),
  /** Koliko minuta se stol drži dok gost plaća akontaciju. */
  holdMinutes: z.number().int().positive(),
});

export const VenueSchema = z.object({
  id: IdSchema,
  slug: IdSchema,
  name: z.string().min(1),
  locale: z.literal("hr-HR"),
  currency: z.literal("EUR"),
  timezone: z.string().min(1),
  theme: VenueThemeSchema,
  policy: VenuePolicySchema,
});

export const FloorSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  name: z.string().min(1),
  order: z.number().int().nonnegative(),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const ZoneSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  floorId: IdSchema,
  name: z.string().min(1),
  /** Minimalna potrošnja za osnovni termin (množitelj 1), u cijelim eurima. */
  minSpend: z.number().int().positive(),
  /** Postotak akontacije od minimalne potrošnje (npr. 30). */
  depositPercent: z.number().int().min(1).max(100),
  color: HexColorSchema,
});

export const TableShapeSchema = z.enum(["round", "rect"]);

export const TableSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  floorId: IdSchema,
  zoneId: IdSchema,
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(0).lt(360),
  width: z.number().positive(),
  height: z.number().positive(),
  shape: TableShapeSchema,
  capacity: z.number().int().positive(),
});

export const DecorationKindSchema = z.enum(["bar", "dj", "dancefloor", "stairs", "wc", "void"]);

export const DecorationSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  floorId: IdSchema,
  kind: DecorationKindSchema,
  label: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number().min(0).lt(360),
  width: z.number().positive(),
  height: z.number().positive(),
});

export const EventKindSchema = z.enum(["regular", "special"]);

export const EventSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  date: IsoDateSchema,
  name: z.string().min(1),
  kind: EventKindSchema,
  priceMultiplier: z.number().positive(),
  /** Početak termina (UTC). */
  startsAt: IsoDateTimeSchema,
});

export const ReservationStatusSchema = z.enum([
  "held",
  "paid",
  "confirmed",
  "checked_in",
  "no_show",
  "cancelled",
]);

/** Abeceda koda rezervacije: bez 0/O, 1/I/L radi čitljivosti. */
export const RESERVATION_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const RESERVATION_CODE_LENGTH = 8;
export const ReservationCodeSchema = z.string().regex(/^[2-9A-HJKMNP-Z]{8}$/, "Neispravan kod rezervacije");

export const CancelReasonSchema = z.enum(["hold_expired", "payment_abandoned", "staff"]);

/** Mobitel u E.164 formatu (npr. +385911234567). */
export const PhoneE164Schema = z.string().regex(/^\+[1-9]\d{7,14}$/, "Neispravan broj mobitela");

export const ReservationSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  eventId: IdSchema,
  tableId: IdSchema,
  code: ReservationCodeSchema,
  status: ReservationStatusSchema,
  partySize: z.number().int().positive(),
  /** Podaci gosta: obavezni kad rezervira gost, seed ih nema. */
  guestName: z.string().min(2).max(60).optional(),
  guestPhone: PhoneE164Schema.optional(),
  /** Cijena zamrznuta u trenutku rezervacije (centi). */
  minSpendCents: z.number().int().nonnegative(),
  depositCents: z.number().int().nonnegative(),
  promoterId: IdSchema.optional(),
  createdAt: IsoDateTimeSchema,
  /** Samo za status "held": trenutak isteka držanja. */
  holdExpiresAt: IsoDateTimeSchema.optional(),
  paidAt: IsoDateTimeSchema.optional(),
  confirmedAt: IsoDateTimeSchema.optional(),
  cancelledAt: IsoDateTimeSchema.optional(),
  cancelReason: CancelReasonSchema.optional(),
});

export const PaymentResultSchema = z.enum(["succeeded", "failed"]);

/** Demo pokušaj plaćanja akontacije (bez pravog naplatnog sustava). */
export const PaymentAttemptSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  reservationId: IdSchema,
  amountCents: z.number().int().nonnegative(),
  result: PaymentResultSchema,
  createdAt: IsoDateTimeSchema,
});

export const PromoterSchema = z.object({
  id: IdSchema,
  venueId: IdSchema,
  name: z.string().min(1),
  code: z.string().regex(/^[A-Z0-9]{3,12}$/, "Kod promotora: 3-12 velikih slova ili brojeva"),
});
