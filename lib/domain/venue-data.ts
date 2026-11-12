import { z } from "zod";
import { findDoubleBookings } from "./reservation-rules";
import {
  DecorationSchema,
  EventSchema,
  FloorSchema,
  PaymentAttemptSchema,
  PromoterSchema,
  ReservationSchema,
  TableSchema,
  VenueSchema,
  ZoneSchema,
} from "./schemas";

/**
 * Cjelokupni JSON jednog kluba (/data/venues/<slug>.json).
 * Osim oblika provjerava referencijalni integritet i pravilo
 * "nikad dvije aktivne rezervacije za isti (stol, event)".
 */
export const VenueDataSchema = z
  .object({
    venue: VenueSchema,
    floors: z.array(FloorSchema).min(1),
    zones: z.array(ZoneSchema).min(1),
    tables: z.array(TableSchema),
    decorations: z.array(DecorationSchema),
    events: z.array(EventSchema),
    reservations: z.array(ReservationSchema),
    promoters: z.array(PromoterSchema),
    paymentAttempts: z.array(PaymentAttemptSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const venueId = data.venue.id;
    const report = (path: (string | number)[], message: string): void => {
      ctx.addIssue({ code: "custom", path, message });
    };

    const collections = {
      floors: data.floors,
      zones: data.zones,
      tables: data.tables,
      decorations: data.decorations,
      events: data.events,
      reservations: data.reservations,
      promoters: data.promoters,
      paymentAttempts: data.paymentAttempts,
    } as const;

    for (const [name, items] of Object.entries(collections)) {
      const ids = new Set<string>();
      items.forEach((item, index) => {
        if (ids.has(item.id)) report([name, index, "id"], `Duplikat ID-a: ${item.id}`);
        ids.add(item.id);
        if (item.venueId !== venueId) {
          report([name, index, "venueId"], `venueId ${item.venueId} ne odgovara klubu ${venueId}`);
        }
      });
    }

    const floorIds = new Set(data.floors.map((floor) => floor.id));
    const zonesById = new Map(data.zones.map((zone) => [zone.id, zone]));
    const tablesById = new Map(data.tables.map((table) => [table.id, table]));
    const eventIds = new Set(data.events.map((event) => event.id));
    const promoterIds = new Set(data.promoters.map((promoter) => promoter.id));

    data.zones.forEach((zone, index) => {
      if (!floorIds.has(zone.floorId)) report(["zones", index, "floorId"], `Nepoznata etaža: ${zone.floorId}`);
    });

    data.tables.forEach((table, index) => {
      if (!floorIds.has(table.floorId)) report(["tables", index, "floorId"], `Nepoznata etaža: ${table.floorId}`);
      const zone = zonesById.get(table.zoneId);
      if (!zone) report(["tables", index, "zoneId"], `Nepoznata zona: ${table.zoneId}`);
      else if (zone.floorId !== table.floorId) {
        report(["tables", index, "zoneId"], `Zona ${zone.id} nije na etaži ${table.floorId}`);
      }
    });

    data.decorations.forEach((decoration, index) => {
      if (!floorIds.has(decoration.floorId)) {
        report(["decorations", index, "floorId"], `Nepoznata etaža: ${decoration.floorId}`);
      }
    });

    const eventDates = new Set<string>();
    data.events.forEach((event, index) => {
      if (eventDates.has(event.date)) report(["events", index, "date"], `Više termina na datum ${event.date}`);
      eventDates.add(event.date);
    });

    data.reservations.forEach((reservation, index) => {
      const table = tablesById.get(reservation.tableId);
      if (!table) report(["reservations", index, "tableId"], `Nepoznat stol: ${reservation.tableId}`);
      else if (reservation.partySize > table.capacity) {
        report(["reservations", index, "partySize"], `Broj gostiju premašuje kapacitet stola ${table.label}`);
      }
      if (!eventIds.has(reservation.eventId)) {
        report(["reservations", index, "eventId"], `Nepoznat termin: ${reservation.eventId}`);
      }
      if (reservation.promoterId && !promoterIds.has(reservation.promoterId)) {
        report(["reservations", index, "promoterId"], `Nepoznat promotor: ${reservation.promoterId}`);
      }
      if (reservation.status === "held" && !reservation.holdExpiresAt) {
        report(["reservations", index, "holdExpiresAt"], "Držana rezervacija mora imati holdExpiresAt");
      }
      if (reservation.status !== "held" && reservation.holdExpiresAt) {
        report(["reservations", index, "holdExpiresAt"], "holdExpiresAt je dopušten samo za status held");
      }
      if ((reservation.status === "cancelled") !== Boolean(reservation.cancelReason)) {
        report(["reservations", index, "cancelReason"], "cancelReason je obavezan točno za status cancelled");
      }
      if (reservation.depositCents > reservation.minSpendCents) {
        report(["reservations", index, "depositCents"], "Akontacija ne može biti veća od min. potrošnje");
      }
    });

    const codes = new Set<string>();
    data.reservations.forEach((reservation, index) => {
      if (codes.has(reservation.code)) report(["reservations", index, "code"], `Duplikat koda: ${reservation.code}`);
      codes.add(reservation.code);
    });

    const reservationIds = new Set(data.reservations.map((reservation) => reservation.id));
    data.paymentAttempts.forEach((attempt, index) => {
      if (!reservationIds.has(attempt.reservationId)) {
        report(["paymentAttempts", index, "reservationId"], `Nepoznata rezervacija: ${attempt.reservationId}`);
      }
    });

    for (const id of findDoubleBookings(data.reservations)) {
      const index = data.reservations.findIndex((reservation) => reservation.id === id);
      report(["reservations", index], `Dvostruka aktivna rezervacija za isti stol i termin (${id})`);
    }
  });
