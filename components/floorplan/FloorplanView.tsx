"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Decoration, Floor, Table, VenueTheme, Zone } from "@/lib/domain/types";
import type { TableAvailability } from "@/lib/domain/table-status";
import { messages } from "@/lib/i18n";
import { FloorplanSkeleton } from "./FloorplanSkeleton";
import { FloorTabs } from "./FloorTabs";
import { StatusLegend } from "./StatusLegend";

/** Konva radi samo u pregledniku. */
const FloorplanCanvas = dynamic(() => import("./FloorplanCanvas"), {
  ssr: false,
  loading: () => <FloorplanSkeleton />,
});

interface FloorplanViewProps {
  floors: readonly Floor[];
  zones: readonly Zone[];
  tables: readonly Table[];
  decorations: readonly Decoration[];
  availability: Readonly<Record<string, TableAvailability>>;
  theme: VenueTheme;
}

export function FloorplanView({ floors, zones, tables, decorations, availability, theme }: FloorplanViewProps) {
  const [activeFloorId, setActiveFloorId] = useState(floors[0]?.id ?? "");
  const floor = floors.find((candidate) => candidate.id === activeFloorId) ?? floors[0];
  const zoneColors = useMemo(() => Object.fromEntries(zones.map((zone) => [zone.id, zone.color])), [zones]);

  if (!floor) return null;

  return (
    <section className="flex flex-col gap-3">
      <FloorTabs floors={floors} activeFloorId={floor.id} onSelect={setActiveFloorId} />
      <FloorplanCanvas
        floor={floor}
        tables={tables.filter((table) => table.floorId === floor.id)}
        decorations={decorations.filter((decoration) => decoration.floorId === floor.id)}
        zoneColors={zoneColors}
        availability={availability}
        theme={theme}
      />
      <StatusLegend />
      <p className="text-xs opacity-60">{messages.floorplan.hint}</p>
    </section>
  );
}
