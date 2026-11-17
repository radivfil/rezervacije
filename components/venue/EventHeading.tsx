import type { Event } from "@/lib/domain/types";
import { formatDateBesideName, formatTime } from "@/lib/format";
import { interpolate, messages } from "@/lib/i18n";

interface EventHeadingProps {
  event: Pick<Event, "name" | "date" | "kind" | "startsAt"> | null;
  timezone: string;
  freeCount: number;
  bookingOpen: boolean;
}

const t = messages.venue;

/** Naslov večeri: ime termina, datum, početak i broj slobodnih stolova. */
export function EventHeading({ event, timezone, freeCount, bookingOpen }: EventHeadingProps) {
  if (!event) return <p className="px-4 py-6 text-muted lg:px-8">{t.noEvents}</p>;
  const date = formatDateBesideName(event.name, event.date);
  return (
    <div className="flex items-end justify-between gap-4 px-4 pt-1 pb-3.5 lg:px-8">
      <div className="min-w-0">
        {event.kind === "special" ? <p className="eyebrow mb-1.5 !text-brand-accent">{t.specialBadge}</p> : null}
        <h2 className="display text-[clamp(1.75rem,8vw,2.75rem)]">{event.name}</h2>
        <p className="mt-1.5 text-sm text-muted">
          {date} · {interpolate(t.startsAt, { time: formatTime(event.startsAt, timezone) })}
        </p>
      </div>
      {bookingOpen ? (
        <p className="shrink-0 text-right" aria-label={interpolate(t.freeTables, { count: freeCount })}>
          <span className="display block text-[1.75rem] text-free tabular-nums">{freeCount}</span>
          <span className="eyebrow">{t.freeLabel}</span>
        </p>
      ) : (
        <p className="eyebrow shrink-0 rounded-ctl border border-line-strong px-2.5 py-1.5">{t.closed}</p>
      )}
    </div>
  );
}
