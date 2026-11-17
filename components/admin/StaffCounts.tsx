import { messages } from "@/lib/i18n";
import type { EventReservations } from "@/lib/services/staff";

export function StaffCounts({ counts }: { counts: EventReservations["counts"] }) {
  const items = [
    { label: messages.admin.counts.reserved, value: counts.reserved, tone: "" },
    { label: messages.admin.counts.arrived, value: counts.arrived, tone: "text-free" },
    { label: messages.admin.counts.expected, value: counts.expected, tone: "" },
    { label: messages.admin.counts.held, value: counts.held, tone: "text-held" },
    { label: messages.admin.counts.noShow, value: counts.noShow, tone: "text-booked" },
  ];
  return (
    <dl className="mx-4 mb-4 grid grid-cols-5 divide-x divide-line border-y border-line lg:mx-8">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col-reverse px-2 py-3 first:pl-0 sm:px-4">
          <dt className="mt-1 truncate text-[0.5625rem] leading-tight font-semibold tracking-[0.02em] text-muted uppercase sm:text-[0.6875rem] sm:tracking-[0.06em]">
            {item.label}
          </dt>
          <dd className={`display text-[1.625rem] tabular-nums ${item.value > 0 ? item.tone : "text-muted"}`}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
