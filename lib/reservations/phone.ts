/**
 * Normalizira broj mobitela u E.164.
 * Prihvaća "+385 91 123 4567", "00385911234567" i hrvatski nacionalni oblik "091 123 4567".
 */
export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().\/]/g, "");
  let candidate: string;
  if (compact.startsWith("+")) candidate = compact;
  else if (compact.startsWith("00")) candidate = `+${compact.slice(2)}`;
  else if (compact.startsWith("0")) candidate = `+385${compact.slice(1)}`;
  else return null;
  return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : null;
}
