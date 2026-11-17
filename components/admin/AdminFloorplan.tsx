"use client";

import Link from "next/link";
import type { Decoration, Event, Floor, PublicVenue, Table, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { calculateTablePrice } from "@/lib/pricing";
import { formatEur } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { reservationHref } from "@/lib/routes";
import type { StaffReservationRow } from "@/lib/services/staff";
import { BottomSheet } from "../floorplan/BottomSheet";
import { FloorplanBoard } from "../floorplan/FloorplanBoard";
import { ZoneMark } from "../floorplan/TableSheet";
import { ManualReservationForm } from "./ManualReservationForm";
import { StaffReservationDetails } from "./ReservationSummary";
import { StaffActionButtons } from "./StaffActionButtons";
import type { ReactNode } from "react";

interface AdminFloorplanProps {
  venue: Pick<PublicVenue, "slug" | "theme" | "timezone">;
  bookingOpen: boolean;
  events: readonly Event[];
  event: Event | null;
  floors: readonly Floor[];
  zones: readonly Zone[];
  tables: readonly Table[];
  decorations: readonly Decoration[];
  availability: Readonly<Record<string, TableAvailability>>;
  rows: readonly StaffReservationRow[];
  children?: ReactNode;
}

const BLOCKING = new Set(["held", "paid", "confirmed", "checked_in"]);

/** Tlocrt za osoblje: tap na stol otvara rezervaciju s akcijama ili ručnu rezervaciju. */
export function AdminFloorplan({ venue, bookingOpen, rows, children, ...board }: AdminFloorplanProps) {
  const rowByTable = new Map(rows.filter((row) => BLOCKING.has(row.reservation.status)).map((row) => [row.table.id, row]));

  return (
    <FloorplanBoard
      {...board}
      bookingOpen={bookingOpen}
      theme={venue.theme}
      timezone={venue.timezone}
      mapClassName="h-[66dvh] min-h-[26rem]"
      renderSheet={(table, close) => {
        const zone = board.zones.find((candidate) => candidate.id === table.zoneId);
        const row = rowByTable.get(table.id);
        const event = board.event;
        return (
          <BottomSheet
            eyebrow={
              zone ? (
                <>
                  <ZoneMark color={zone.color} />
                  {zone.name}
                </>
              ) : undefined
            }
            title={interpolate(messages.tableSheet.title, { label: table.label })}
            closeLabel={messages.tableSheet.close}
            onClose={close}
            focusKey={table.id}
          >
            {row ? (
              <div className="flex flex-col gap-3 pb-2">
                <StaffReservationDetails reservation={row.reservation} />
                <StaffActionButtons key={row.reservation.code} slug={venue.slug} code={row.reservation.code} actions={row.actions} />
                <Link href={reservationHref(venue.slug, row.reservation.code)} className="btn btn-quiet">
                  {messages.admin.open}
                </Link>
              </div>
            ) : event && zone && bookingOpen ? (
              <ManualReservationForm
                key={`${table.id}-${event.id}`}
                slug={venue.slug}
                tableId={table.id}
                date={event.date}
                capacity={table.capacity}
                depositLabel={formatEur(calculateTablePrice(zone, event).depositCents)}
              />
            ) : (
              <p className="note">{messages.admin.manual.closed}</p>
            )}
          </BottomSheet>
        );
      }}
    >
      {children}
    </FloorplanBoard>
  );
}
