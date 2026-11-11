import { AVAILABILITY_COLORS, AVAILABILITY_ORDER } from "@/lib/floorplan/colors";
import { messages } from "@/lib/i18n";

export function StatusLegend() {
  return (
    <ul aria-label={messages.floorplan.legendLabel} className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {AVAILABILITY_ORDER.map((status) => (
        <li key={status} className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block size-3.5 rounded-full"
            style={{ backgroundColor: AVAILABILITY_COLORS[status] }}
          />
          {messages.floorplan.status[status]}
        </li>
      ))}
    </ul>
  );
}
