"use client";

import { useEffect, useRef } from "react";
import type { Event } from "@/lib/domain/types";
import { formatShortDate, formatShortWeekday } from "@/lib/format";
import { messages } from "@/lib/i18n";

interface DatePickerProps {
  events: readonly Pick<Event, "id" | "date" | "kind">[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DatePicker({ events, selectedDate, onSelect }: DatePickerProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [selectedDate]);

  return (
    <nav aria-label={messages.venue.dateLabel}>
      <ul className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pt-2 pb-1 [scrollbar-width:none]">
        {events.map((event) => {
          const selected = event.date === selectedDate;
          return (
            <li key={event.id} className="snap-start">
              <button
                ref={selected ? selectedRef : undefined}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(event.date)}
                className={`relative flex min-h-14 min-w-16 flex-col whitespace-nowrap items-center justify-center rounded-xl px-3 py-1 text-sm transition-colors ${
                  selected ? "bg-brand-primary text-brand-on-primary" : "bg-brand-surface"
                }`}
              >
                <span className="text-xs uppercase opacity-80">{formatShortWeekday(event.date)}</span>
                <span className="font-semibold">{formatShortDate(event.date)}</span>
                {event.kind === "special" ? (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-brand-accent px-1.5 text-[10px] font-bold text-black">
                    {messages.venue.specialBadge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
