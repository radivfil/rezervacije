import type { Floor } from "@/lib/domain/types";
import { messages } from "@/lib/i18n";

interface FloorTabsProps {
  floors: readonly Pick<Floor, "id" | "name">[];
  activeFloorId: string;
  /** Broj slobodnih stolova po etaži. */
  freeByFloor: Readonly<Record<string, number>>;
  onSelect: (floorId: string) => void;
}

export function FloorTabs({ floors, activeFloorId, freeByFloor, onSelect }: FloorTabsProps) {
  return (
    <div
      role="tablist"
      aria-label={messages.floorplan.floorsLabel}
      className="pointer-events-auto flex overflow-hidden rounded-ctl border border-line-strong bg-brand-surface/90 shadow-[0_6px_20px_rgba(0,0,0,0.14)] backdrop-blur-sm"
    >
      {floors.map((floor) => {
        const active = floor.id === activeFloorId;
        return (
          <button
            key={floor.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(floor.id)}
            className={`flex min-h-11 items-center gap-2 px-3.5 text-sm font-semibold transition-colors ${
              active ? "bg-brand-text text-brand-background" : "text-brand-text hover:bg-brand-text/8"
            }`}
          >
            {floor.name}
            <span className={`text-xs font-medium tabular-nums ${active ? "opacity-70" : "text-muted"}`}>
              {freeByFloor[floor.id] ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}
