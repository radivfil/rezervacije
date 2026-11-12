import { RESERVATION_CODE_ALPHABET, RESERVATION_CODE_LENGTH } from "../domain/schemas";

/** Vraća slučajan cijeli broj u [0, maxExclusive). */
export type RandomIndex = (maxExclusive: number) => number;

/** Kriptografski slučajan indeks bez pristranosti (rejection sampling). */
export const cryptoRandomIndex: RandomIndex = (maxExclusive) => {
  if (maxExclusive < 1 || maxExclusive > 256) throw new Error("maxExclusive mora biti 1-256");
  const limit = 256 - (256 % maxExclusive);
  const buffer = new Uint8Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    const value = buffer[0] ?? 255;
    if (value < limit) return value % maxExclusive;
  }
};

/** Kod rezervacije od 8 znakova iz abecede bez 0/O/1/I/L. */
export function generateReservationCode(randomIndex: RandomIndex = cryptoRandomIndex): string {
  let code = "";
  for (let i = 0; i < RESERVATION_CODE_LENGTH; i += 1) {
    code += RESERVATION_CODE_ALPHABET[randomIndex(RESERVATION_CODE_ALPHABET.length)];
  }
  return code;
}
