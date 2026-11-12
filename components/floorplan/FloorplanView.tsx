"use client";

import type { Decoration, Event, Floor, PublicVenue, Table, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { buildTableDetails } from "@/lib/floorplan/table-details";
import { bookingHref } from "@/lib/routes";
import { FloorplanBoard } from "./FloorplanBoard";
import { TableSheet } from "./TableSheet";

interface FloorplanViewProps {
  venue: Pick<PublicVenue, "slug" | "theme" | "policy">;
  bookingOpen: boolean;
  events: readonly Event[];
  event: Event | null;
  floors: readonly Floor[];
  zones: readonly Zone[];
  tables: readonly Table[];
  decorations: readonly Decoration[];
  availability: Readonly<Record<string, TableAvailability>>;
}

/** Tlocrt za gosta. */
export function FloorplanView({ venue, bookingOpen, ...board }: FloorplanViewProps) {
  return (
    <FloorplanBoard
      {...board}
      theme={venue.theme}
      renderSheet={(table, close) => {
        const details = buildTableDetails({
          table,
          zones: board.zones,
          floors: board.floors,
          event: board.event,
          availability: board.availability,
          policy: venue.policy,
          bookingOpen,
        });
        const bookHref = details.canBook && board.event ? bookingHref(venue.slug, table.id, board.event.date) : null;
        return <TableSheet details={details} bookHref={bookHref} onClose={close} />;
      }}
    />
  );
}
