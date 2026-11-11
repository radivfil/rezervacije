import type { Floor } from "@/lib/domain/types";
import { messages } from "@/lib/i18n";

interface FloorTabsProps {
  floors: readonly Pick<Floor, "id" | "name">[];
  activeFloorId: string;
  onSelect: (floorId: string) => void;
}

export function FloorTabs({ floors, activeFloorId, onSelect }: FloorTabsProps) {
  return (
    <div role="tablist" aria-label={messages.floorplan.floorsLabel} className="flex gap-1 rounded-xl bg-brand-surface p-1">
      {floors.map((floor) => {
        const active = floor.id === activeFloorId;
        return (
          <button
            key={floor.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(floor.id)}
            className={`min-h-11 flex-1 rounded-lg px-4 text-sm font-semibold transition-colors ${
              active ? "bg-brand-primary text-brand-on-primary" : "hover:bg-brand-background/40"
            }`}
          >
            {floor.name}
          </button>
        );
      })}
    </div>
  );
}
