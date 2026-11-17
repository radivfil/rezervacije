import { interpolate, messages } from "@/lib/i18n";

export interface ZoneChip {
  id: string;
  name: string;
  color: string;
  /** Minimalna potrošnja za odabrani termin, već formatirana; null bez termina. */
  price: string | null;
  free: number;
}

interface ZoneChipsProps {
  zones: readonly ZoneChip[];
  activeZoneId: string | null;
  onToggle: (zoneId: string) => void;
}

/** Zone etaže s cijenom; dodir ističe stolove te zone na tlocrtu. */
export function ZoneChips({ zones, activeZoneId, onToggle }: ZoneChipsProps) {
  return (
    <ul
      aria-label={messages.floorplan.zonesLabel}
      className="pointer-events-auto flex snap-x gap-2 overflow-x-auto px-3 pt-1 pb-3 [scrollbar-width:none] lg:px-8"
    >
      {zones.map((zone) => {
        const active = zone.id === activeZoneId;
        return (
          <li key={zone.id} className="shrink-0 snap-start">
            <button
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(zone.id)}
              className={`flex min-h-12 items-center gap-2.5 rounded-ctl border py-1.5 pr-3.5 pl-2.5 text-left backdrop-blur-sm transition-colors ${
                active
                  ? "border-brand-text bg-brand-text text-brand-background"
                  : "border-line-strong bg-brand-surface/90 hover:border-brand-text/60"
              }`}
            >
              <span aria-hidden className="h-7 w-1.5 rounded-full" style={{ backgroundColor: zone.color }} />
              <span className="flex flex-col leading-tight">
                <span className="text-[0.8125rem] font-semibold">{zone.name}</span>
                <span className={`text-xs tabular-nums ${active ? "opacity-75" : "text-muted"}`}>
                  {zone.price ? `${zone.price} · ` : ""}
                  {interpolate(messages.floorplan.zoneFree, { free: zone.free })}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
