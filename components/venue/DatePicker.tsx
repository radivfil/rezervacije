"use client";

import { useEffect, useRef } from "react";
import type { Event } from "@/lib/domain/types";
import { formatDayNumber, formatShortMonth, formatShortWeekday } from "@/lib/format";
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
    <nav aria-label={messages.venue.dateLabel} className="relative">
      <ul className="flex snap-x gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:px-8">
        {events.map((event) => {
          const selected = event.date === selectedDate;
          const special = event.kind === "special";
          return (
            <li key={event.id} className="shrink-0 snap-start">
              <button
                ref={selected ? selectedRef : undefined}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(event.date)}
                className={`relative flex h-[4.25rem] w-[3.25rem] flex-col items-center justify-center rounded-ctl border transition-colors ${
                  selected
                    ? "border-brand-text bg-brand-text text-brand-background"
                    : special
                      ? "border-brand-accent/70 hover:bg-brand-accent/10"
                      : "border-line hover:border-line-strong"
                }`}
              >
                <span className={`text-[0.625rem] font-semibold tracking-[0.12em] uppercase ${selected ? "opacity-70" : "text-muted"}`}>
                  {formatShortWeekday(event.date)}
                </span>
                <span className="display text-[1.375rem] tabular-nums">{formatDayNumber(event.date)}</span>
                <span className={`text-[0.625rem] font-medium ${selected ? "opacity-70" : "text-muted"}`}>
                  {formatShortMonth(event.date)}
                </span>
                {special ? (
                  <>
                    <span aria-hidden className="absolute -top-1 -right-1 size-2.5 rounded-full bg-brand-accent ring-2 ring-brand-background" />
                    <span className="sr-only">{messages.venue.specialBadge}</span>
                  </>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-brand-background to-transparent" />
    </nav>
  );
}
