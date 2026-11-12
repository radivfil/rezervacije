const LOCALE = "hr-HR";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const eurFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });

/** Datum YYYY-MM-DD kao npr. "četvrtak, 12. studenoga 2026." */
export function formatEventDate(isoDate: string): string {
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(time)) throw new Error(`Neispravan datum: ${isoDate}`);
  return dateFormatter.format(new Date(time));
}

/** Iznos u centima kao npr. "1.040,00 €". */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100);
}

/** Kalendarski datum (YYYY-MM-DD) trenutka `date` u vremenskoj zoni kluba. */
export function isoDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const shortWeekdayFormatter = new Intl.DateTimeFormat(LOCALE, { weekday: "short", timeZone: "UTC" });
const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "numeric", timeZone: "UTC" });
const multiplierFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 });

function parseIsoDate(isoDate: string): Date {
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(time)) throw new Error(`Neispravan datum: ${isoDate}`);
  return new Date(time);
}

/** Kratki dan u tjednu, npr. "čet". */
export function formatShortWeekday(isoDate: string): string {
  return shortWeekdayFormatter.format(parseIsoDate(isoDate)).replace(/\.$/, "");
}

/** Kratki datum, npr. "12. 11." */
export function formatShortDate(isoDate: string): string {
  return shortDateFormatter.format(parseIsoDate(isoDate));
}

/** Množitelj cijene, npr. "×1,3". */
export function formatMultiplier(multiplier: number): string {
  return `×${multiplierFormatter.format(multiplier)}`;
}

/** Vrijeme početka termina u vremenskoj zoni kluba, npr. "23:00". */
export function formatTime(isoDateTime: string, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(
    new Date(isoDateTime),
  );
}

/** Kod rezervacije u dvije skupine radi čitljivosti, npr. "ABCD 2345". */
export function formatReservationCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)} ${code.slice(4)}` : code;
}

/** Preostale minute i sekunde, npr. "9:05". */
export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
