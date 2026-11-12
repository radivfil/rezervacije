import { messages } from "@/lib/i18n";
import type { EventReservations } from "@/lib/services/staff";

export function StaffCounts({ counts }: { counts: EventReservations["counts"] }) {
  const items = [
    { label: messages.admin.counts.reserved, value: counts.reserved },
    { label: messages.admin.counts.arrived, value: counts.arrived },
    { label: messages.admin.counts.expected, value: counts.expected },
    { label: messages.admin.counts.held, value: counts.held },
    { label: messages.admin.counts.noShow, value: counts.noShow },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl bg-brand-surface p-3 text-center">
          <dt className="text-xs opacity-70">{item.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
