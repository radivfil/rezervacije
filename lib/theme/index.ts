import type { VenueTheme } from "../domain/types";

/** Fontovi koje klub može odabrati u configu; vrijednost je CSS varijabla iz app/fonts.ts. */
export const FONT_VARIABLES = {
  Inter: "--font-inter",
  "Playfair Display": "--font-playfair",
} as const;

export type SupportedFont = keyof typeof FONT_VARIABLES;

export const SUPPORTED_FONTS = Object.keys(FONT_VARIABLES) as [SupportedFont, ...SupportedFont[]];

const FALLBACK_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** CSS varijable kluba koje koriste Tailwind tokeni (brand-*). */
export function themeToCssVars(theme: VenueTheme): Record<`--${string}`, string> {
  return {
    "--brand-primary": theme.colors.primary,
    "--brand-accent": theme.colors.accent,
    "--brand-background": theme.colors.background,
    "--brand-surface": theme.colors.surface,
    "--brand-text": theme.colors.text,
    "--brand-on-primary": readableTextOn(theme.colors.primary),
    "--brand-font": `var(${FONT_VARIABLES[theme.fontFamily]}), ${FALLBACK_STACK}`,
  };
}

/** Relativna luminancija (WCAG) boje #RRGGBB. */
export function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Crna ili bijela, ovisno o tome što ima bolji kontrast na zadanoj pozadini. */
export function readableTextOn(hex: string): "#000000" | "#ffffff" {
  const l = luminance(hex);
  const contrastWhite = 1.05 / (l + 0.05);
  const contrastBlack = (l + 0.05) / 0.05;
  return contrastBlack >= contrastWhite ? "#000000" : "#ffffff";
}
