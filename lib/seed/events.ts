import type { Event } from "../domain/types";
import { multiplierForDate, PRICE_MULTIPLIERS } from "../pricing";
import { zonedDateTimeToUtc } from "../time";

export function addDays(isoDate: string, days: number): string {
  const time = Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000;
  return new Date(time).toISOString().slice(0, 10);
}

export const EVENT_START_TIME = "23:00";

const SPECIAL_EVENT_NAMES = ["Glow Night", "Retro Party", "Guest DJ Night", "White Party"] as const;
const REGULAR_NAMES: Readonly<Record<number, string>> = {
  4: "Četvrtak",
  5: "Petak",
  6: "Subota",
};

/**
 * Termini od startDate kroz `weeks` tjedana: svaki čet/pet/sub.
 * Svaka treća subota je posebni event (množitelj 1.5). Svi termini počinju u `startTime` po vremenu kluba.
 */
export function generateEvents(
  venueId: string,
  startDate: string,
  weeks: number,
  options: { timeZone: string; startTime: string } = { timeZone: "Europe/Zagreb", startTime: EVENT_START_TIME },
): Event[] {
  const events: Event[] = [];
  let saturdayIndex = 0;
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = addDays(startDate, offset);
    const regular = multiplierForDate(date);
    if (regular === null) continue;
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    let special = false;
    if (weekday === 6) {
      special = saturdayIndex % 3 === 2;
      saturdayIndex += 1;
    }
    const name = special
      ? SPECIAL_EVENT_NAMES[Math.floor(saturdayIndex / 3 - 1) % SPECIAL_EVENT_NAMES.length] ?? "Posebni event"
      : REGULAR_NAMES[weekday] ?? "Termin";
    events.push({
      id: `${venueId}-ev-${date}`,
      venueId,
      date,
      name,
      kind: special ? "special" : "regular",
      priceMultiplier: special ? PRICE_MULTIPLIERS.special : regular,
      startsAt: zonedDateTimeToUtc(date, options.startTime, options.timeZone).toISOString(),
    });
  }
  return events;
}
