import type { Event } from "@/lib/domain/types";
import { formatEventDate } from "@/lib/format";
import { messages } from "@/lib/i18n";

export function EventSummary({ event }: { event: Pick<Event, "name" | "date"> | null }) {
  if (!event) return <p className="rounded-xl bg-brand-surface p-4">{messages.venue.noEvents}</p>;
  return (
    <section className="rounded-xl bg-brand-surface px-4 py-3">
      <p className="text-xs uppercase tracking-wide opacity-70">{messages.venue.eventLabel}</p>
      <p className="font-semibold">{event.name}</p>
      <p className="text-sm opacity-80">{formatEventDate(event.date)}</p>
    </section>
  );
}
