import type { Event, Zone } from "../domain/types";

/** Množitelji cijene po terminu (canvas 01, Operations 2). */
export const PRICE_MULTIPLIERS = {
  thursday: 0.6,
  friday: 1,
  saturday: 1.3,
  special: 1.5,
} as const;

/** Dani u tjednu (0 = nedjelja, kao Date#getUTCDay). */
const WEEKDAY_MULTIPLIER: Readonly<Partial<Record<number, number>>> = {
  4: PRICE_MULTIPLIERS.thursday,
  5: PRICE_MULTIPLIERS.friday,
  6: PRICE_MULTIPLIERS.saturday,
};

/** Dan u tjednu za datum YYYY-MM-DD, neovisno o vremenskoj zoni. */
export function weekdayOf(isoDate: string): number {
  const time = Date.parse(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(time)) throw new Error(`Neispravan datum: ${isoDate}`);
  return new Date(time).getUTCDay();
}

/**
 * Množitelj za termin na zadani datum.
 * Posebni event uvijek ima 1.5; inače čet/pet/sub. Ostali dani nemaju termin (null).
 */
export function multiplierForDate(isoDate: string, options: { special?: boolean } = {}): number | null {
  if (options.special) return PRICE_MULTIPLIERS.special;
  return WEEKDAY_MULTIPLIER[weekdayOf(isoDate)] ?? null;
}

export interface TablePrice {
  /** Minimalna potrošnja za termin, u centima. */
  minSpendCents: number;
  /** Akontacija, u centima. */
  depositCents: number;
  depositPercent: number;
  multiplier: number;
}

/**
 * cijena = zona.minSpend x event.priceMultiplier
 * akontacija = cijena x depositPercent
 * Iznosi su u centima (cijeli brojevi), zaokruženi na najbliži cent.
 */
export function calculateTablePrice(
  zone: Pick<Zone, "minSpend" | "depositPercent">,
  event: Pick<Event, "priceMultiplier">,
): TablePrice {
  if (!(event.priceMultiplier > 0)) throw new Error("Množitelj cijene mora biti pozitivan");
  if (zone.depositPercent < 0 || zone.depositPercent > 100) {
    throw new Error("Postotak akontacije mora biti između 0 i 100");
  }
  const minSpendCents = Math.round(zone.minSpend * 100 * event.priceMultiplier);
  const depositCents = Math.round((minSpendCents * zone.depositPercent) / 100);
  return {
    minSpendCents,
    depositCents,
    depositPercent: zone.depositPercent,
    multiplier: event.priceMultiplier,
  };
}
