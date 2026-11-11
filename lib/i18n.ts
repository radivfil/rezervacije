import hr from "../messages/hr.json";

/** Svi UI tekstovi (hr). */
export const messages = hr;
export type Messages = typeof hr;

/** Zamjenjuje {placeholder} vrijednostima. */
export function interpolate(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
