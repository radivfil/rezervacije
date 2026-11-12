/** Pomak vremenske zone (ms) u zadanom trenutku: lokalno vrijeme - UTC. */
function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Lokalni datum (YYYY-MM-DD) i vrijeme (HH:MM) u vremenskoj zoni kluba -> UTC trenutak. */
export function zonedDateTimeToUtc(isoDate: string, time: string, timeZone: string): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) throw new Error(`Neispravan datum ili vrijeme: ${isoDate} ${time}`);
  const guess = Date.UTC(
    Number(dateMatch[1]),
    Number(dateMatch[2]) - 1,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
  );
  const firstOffset = timeZoneOffsetMs(new Date(guess), timeZone);
  const candidate = guess - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(candidate), timeZone);
  return new Date(secondOffset === firstOffset ? candidate : guess - secondOffset);
}
