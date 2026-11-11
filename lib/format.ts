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
