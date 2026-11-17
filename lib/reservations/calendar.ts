/** Podaci za kalendarski zapis rezervacije (.ics). */
export interface CalendarEntry {
  uid: string;
  title: string;
  location: string;
  description: string;
  /** Početak termina (ISO, UTC). */
  startsAt: string;
  durationHours: number;
  /** Trenutak izrade zapisa (ISO, UTC). */
  createdAt: string;
  url?: string;
}

function icsTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Neispravno vrijeme: ${iso}`);
  return `${date.toISOString().slice(0, 19).replace(/[-:]/g, "")}Z`;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}

/** iCalendar (RFC 5545) zapis s jednim događajem. */
export function buildIcs(entry: CalendarEntry): string {
  const end = new Date(Date.parse(entry.startsAt) + entry.durationHours * 3_600_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//rezervacija//HR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeText(entry.uid)}`,
    `DTSTAMP:${icsTime(entry.createdAt)}`,
    `DTSTART:${icsTime(entry.startsAt)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${escapeText(entry.title)}`,
    `LOCATION:${escapeText(entry.location)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    ...(entry.url ? [`URL:${entry.url}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function icsDataUri(entry: CalendarEntry): string {
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(buildIcs(entry))}`;
}
