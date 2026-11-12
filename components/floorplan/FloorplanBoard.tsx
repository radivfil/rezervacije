"use client";

import { useCallback, useEffect, useMemo, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { Decoration, Event, Floor, Table, VenueTheme, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { floorplanStore, useFloorplanStore } from "@/lib/floorplan/store";
import { messages } from "@/lib/i18n";
import { venueDateHref } from "@/lib/routes";
import { DatePicker } from "../venue/DatePicker";
import { EventSummary } from "../venue/EventSummary";
import { FloorplanSkeleton } from "./FloorplanSkeleton";
import { FloorTabs } from "./FloorTabs";
import { StatusLegend } from "./StatusLegend";

/** Konva radi samo u pregledniku. */
const FloorplanCanvas = dynamic(() => import("./FloorplanCanvas"), {
  ssr: false,
  loading: () => <FloorplanSkeleton />,
});

export interface FloorplanBoardProps {
  theme: VenueTheme;
  events: readonly Event[];
  event: Event | null;
  floors: readonly Floor[];
  zones: readonly Zone[];
  tables: readonly Table[];
  decorations: readonly Decoration[];
  availability: Readonly<Record<string, TableAvailability>>;
  /** Panel za odabrani stol (gost ili osoblje). */
  renderSheet: (table: Table, close: () => void) => ReactNode;
  /** Sadržaj između sažetka termina i tlocrta (npr. brojke za osoblje). */
  children?: ReactNode;
}

/** Odabir datuma, etaže i stola na tlocrtu; zajedničko gostu i osoblju. */
export function FloorplanBoard({
  theme,
  events,
  event,
  floors,
  zones,
  tables,
  decorations,
  availability,
  renderSheet,
  children,
}: FloorplanBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const activeFloorId = useFloorplanStore((state) => state.activeFloorId);
  const selectedTableId = useFloorplanStore((state) => state.selectedTableId);
  const { setFloor, selectTable, clearSelection } = floorplanStore.getState();

  // Odabir se ne prenosi na drugi klub ili sljedeći posjet.
  useEffect(() => () => floorplanStore.getState().reset(), []);

  const floor = floors.find((candidate) => candidate.id === activeFloorId) ?? floors[0];
  const zoneColors = useMemo(() => Object.fromEntries(zones.map((zone) => [zone.id, zone.color])), [zones]);
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const close = useCallback(() => clearSelection(), [clearSelection]);

  const selectDate = (date: string): void => {
    startTransition(() => {
      router.replace(venueDateHref(pathname, date), { scroll: false });
    });
  };

  if (!floor) return null;

  return (
    <section className={`flex flex-col gap-3 ${selectedTable ? "pb-[50dvh]" : ""}`}>
      <DatePicker events={events} selectedDate={event?.date ?? null} onSelect={selectDate} />
      <EventSummary event={event} />
      {children}
      <FloorTabs floors={floors} activeFloorId={floor.id} onSelect={setFloor} />
      <div aria-busy={isPending} className={`transition-opacity ${isPending ? "opacity-60" : ""}`}>
        <FloorplanCanvas
          floor={floor}
          tables={tables.filter((table) => table.floorId === floor.id)}
          decorations={decorations.filter((decoration) => decoration.floorId === floor.id)}
          zoneColors={zoneColors}
          availability={availability}
          theme={theme}
          selectedTableId={selectedTableId}
          onSelectTable={selectTable}
          onClearSelection={clearSelection}
        />
      </div>
      <StatusLegend />
      <p className="text-xs opacity-60">{messages.floorplan.hint}</p>
      {selectedTable ? renderSheet(selectedTable, close) : null}
    </section>
  );
}
