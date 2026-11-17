import type { TableAvailability } from "@/lib/domain/table-status";
import { AVAILABILITY_CSS_VARS, AVAILABILITY_ORDER } from "@/lib/floorplan/colors";
import { messages } from "@/lib/i18n";

/** Znak statusa kakav je i na tlocrtu: pun = slobodan, crtkan = držan, blijed = zauzet. */
export function StatusGlyph({ status, size = 12 }: { status: TableAvailability; size?: number }) {
  const color = AVAILABILITY_CSS_VARS[status];
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden className="shrink-0">
      {status === "free" ? (
        <circle cx="6" cy="6" r="5.5" fill={color} />
      ) : (
        <circle
          cx="6"
          cy="6"
          r="4.75"
          fill={color}
          fillOpacity={0.16}
          stroke={color}
          strokeWidth="1.5"
          strokeOpacity={status === "held" ? 1 : 0.6}
          strokeDasharray={status === "held" ? "2.6 2.2" : undefined}
        />
      )}
    </svg>
  );
}

export function StatusLegend() {
  return (
    <ul
      aria-label={messages.floorplan.legendLabel}
      className="flex items-center gap-3 rounded-ctl bg-brand-background/75 px-1 py-1.5 text-[0.6875rem] font-medium text-muted backdrop-blur-sm"
    >
      {AVAILABILITY_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <StatusGlyph status={status} size={10} />
          {messages.floorplan.status[status]}
        </li>
      ))}
    </ul>
  );
}
