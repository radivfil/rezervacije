"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { Decoration, Event, Floor, Table, VenueTheme, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { floorplanStore, useFloorplanStore } from "@/lib/floorplan/store";
import { formatEurCompact } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";
import { calculateTablePrice } from "@/lib/pricing";
import { venueDateHref } from "@/lib/routes";
import { DatePicker } from "../venue/DatePicker";
import { EventHeading } from "../venue/EventHeading";
import { FloorplanSkeleton } from "./FloorplanSkeleton";
import { FloorTabs } from "./FloorTabs";
import { SheetAnchorContext, useSheetInsets } from "./SheetAnchor";
import { StatusLegend } from "./StatusLegend";
import { ZoneChips, type ZoneChip } from "./ZoneChips";
import { ZoomControls } from "./ZoomControls";
import type { FloorplanControls } from "./FloorplanCanvas";

/** Konva radi samo u pregledniku. */
const FloorplanCanvas = dynamic(() => import("./FloorplanCanvas"), {
  ssr: false,
  loading: () => <FloorplanSkeleton className="absolute inset-0 border-0" />,
});

/** Visina kontrola preko tlocrta (px): etaže i zum gore, legenda i zone dolje. */
const CHROME = { top: 64, right: 0, bottom: 104, left: 0 };

export interface FloorplanBoardProps {
  theme: VenueTheme;
  timezone: string;
  bookingOpen: boolean;
  events: readonly Event[];
  event: Event | null;
  floors: readonly Floor[];
  zones: readonly Zone[];
  tables: readonly Table[];
  decorations: readonly Decoration[];
  availability: Readonly<Record<string, TableAvailability>>;
  /** Visina tlocrta: gostu ispunjava ostatak zaslona, osoblju je fiksna unutar stranice. */
  mapClassName?: string;
  /** Panel za odabrani stol (gost ili osoblje). */
  renderSheet: (table: Table, close: () => void) => ReactNode;
  /** Sadržaj između naslova termina i tlocrta (npr. brojke za osoblje). */
  children?: ReactNode;
}

/** Odabir datuma, etaže i stola na tlocrtu; zajedničko gostu i osoblju. */
export function FloorplanBoard({
  theme,
  timezone,
  bookingOpen,
  events,
  event,
  floors,
  zones,
  tables,
  decorations,
  availability,
  mapClassName = "min-h-[26rem] flex-1",
  renderSheet,
  children,
}: FloorplanBoardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const activeFloorId = useFloorplanStore((state) => state.activeFloorId);
  const selectedTableId = useFloorplanStore((state) => state.selectedTableId);
  const highlightZoneId = useFloorplanStore((state) => state.highlightZoneId);
  const { setFloor, selectTable, clearSelection, toggleZone } = floorplanStore.getState();
  const [mapElement, setMapElement] = useState<HTMLElement | null>(null);
  const [sheetElement, setSheetElement] = useState<HTMLElement | null>(null);
  const sheetInsets = useSheetInsets(mapElement, sheetElement);
  // Kontrole pri vrhu i zone pri dnu također prekrivaju tlocrt.
  const insets = useMemo(
    () => ({ ...CHROME, right: sheetInsets.right, bottom: Math.max(sheetInsets.bottom, CHROME.bottom) }),
    [sheetInsets],
  );
  const controls = useRef<FloorplanControls | null>(null);

  // Odabir se ne prenosi na drugi klub ili sljedeći posjet.
  useEffect(() => () => floorplanStore.getState().reset(), []);

  const floor = floors.find((candidate) => candidate.id === activeFloorId) ?? floors[0];
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const close = useCallback(() => clearSelection(), [clearSelection]);

  const isFree = useCallback((table: Table): boolean => (availability[table.id] ?? "free") === "free", [availability]);
  const freeByFloor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const table of tables) if (isFree(table)) counts[table.floorId] = (counts[table.floorId] ?? 0) + 1;
    return counts;
  }, [tables, isFree]);
  const freeCount = Object.values(freeByFloor).reduce((sum, count) => sum + count, 0);

  const zoneById = useMemo(() => new Map(zones.map((zone) => [zone.id, zone])), [zones]);
  const zoneColors = useMemo(() => Object.fromEntries(zones.map((zone) => [zone.id, zone.color])), [zones]);
  const priceByZone = useMemo(
    () =>
      Object.fromEntries(
        zones.map((zone) => [zone.id, event ? formatEurCompact(calculateTablePrice(zone, event).minSpendCents) : null]),
      ),
    [zones, event],
  );
  const floorTables = useMemo(() => tables.filter((table) => table.floorId === floor?.id), [tables, floor?.id]);
  const floorDecorations = useMemo(
    () => decorations.filter((decoration) => decoration.floorId === floor?.id),
    [decorations, floor?.id],
  );
  const chips: ZoneChip[] = zones
    .filter((zone) => zone.floorId === floor?.id)
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      price: priceByZone[zone.id] ?? null,
      free: floorTables.filter((table) => table.zoneId === zone.id && isFree(table)).length,
    }));

  const tableDetail = useCallback((table: Table): string => priceByZone[table.zoneId] ?? "", [priceByZone]);
  const tableAriaLabel = useCallback(
    (table: Table): string =>
      interpolate(messages.floorplan.tableOption, {
        label: table.label,
        zone: zoneById.get(table.zoneId)?.name ?? "",
        status: messages.floorplan.status[availability[table.id] ?? "free"],
      }),
    [zoneById, availability],
  );

  const selectDate = (date: string): void => {
    startTransition(() => {
      router.replace(venueDateHref(pathname, date), { scroll: false });
    });
  };

  if (!floor) return null;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <DatePicker events={events} selectedDate={event?.date ?? null} onSelect={selectDate} />
      <EventHeading event={event} timezone={timezone} freeCount={freeCount} bookingOpen={bookingOpen} />
      {children}
      <div
        ref={setMapElement}
        aria-busy={isPending}
        className={`relative overflow-hidden border-y border-line transition-opacity ${isPending ? "opacity-60" : ""} ${mapClassName}`}
      >
        <FloorplanCanvas
          floor={floor}
          tables={floorTables}
          decorations={floorDecorations}
          zoneColors={zoneColors}
          availability={availability}
          theme={theme}
          selectedTableId={selectedTableId}
          highlightZoneId={highlightZoneId}
          tableDetail={tableDetail}
          tableAriaLabel={tableAriaLabel}
          chrome={CHROME}
          insets={insets}
          controlsRef={controls}
          onSelectTable={selectTable}
          onClearSelection={clearSelection}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 lg:px-8">
          <FloorTabs floors={floors} activeFloorId={floor.id} freeByFloor={freeByFloor} onSelect={setFloor} />
          <ZoomControls
            onZoomIn={() => controls.current?.zoomIn()}
            onZoomOut={() => controls.current?.zoomOut()}
            onReset={() => controls.current?.reset()}
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          <div className="flex px-3 lg:px-8">
            <StatusLegend />
          </div>
          <ZoneChips zones={chips} activeZoneId={highlightZoneId} onToggle={toggleZone} />
        </div>
        <SheetAnchorContext value={setSheetElement}>
          {selectedTable ? renderSheet(selectedTable, close) : null}
        </SheetAnchorContext>
      </div>
    </section>
  );
}
