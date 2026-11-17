import type { VenueTheme } from "../domain/types";

interface FontSpec {
  /** CSS varijabla fonta naslova (app/fonts.ts). */
  display: string;
  /** CSS varijabla fonta teksta sučelja. */
  body: string;
  weight: string;
  stretch: string;
  transform: string;
  tracking: string;
  style: string;
}

/** Fontovi koje klub može odabrati u configu. Odabrani font nosi naslove; tekst sučelja je uvijek čitljiv grotesk. */
export const FONTS = {
  Inter: {
    display: "--font-inter",
    body: "--font-inter",
    weight: "700",
    stretch: "100%",
    transform: "none",
    tracking: "-0.02em",
    style: "normal",
  },
  "Playfair Display": {
    display: "--font-playfair",
    body: "--font-archivo",
    weight: "500",
    stretch: "100%",
    transform: "none",
    tracking: "-0.01em",
    style: "italic",
  },
  Archivo: {
    display: "--font-archivo",
    body: "--font-archivo",
    weight: "800",
    stretch: "125%",
    transform: "uppercase",
    tracking: "0",
    style: "normal",
  },
} as const satisfies Record<string, FontSpec>;

export type SupportedFont = keyof typeof FONTS;

export const SUPPORTED_FONTS = Object.keys(FONTS) as [SupportedFont, ...SupportedFont[]];

const SANS_FALLBACK = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

/** Boje statusa stola (zeleno slobodan, žuto držan, crveno zauzet), ugođene za tamnu i svijetlu podlogu. */
export interface StatusPalette {
  free: string;
  held: string;
  booked: string;
}

const STATUS_ON_DARK: StatusPalette = { free: "#3ddc97", held: "#ffc53d", booked: "#ff6166" };
const STATUS_ON_LIGHT: StatusPalette = { free: "#1a9f5c", held: "#d98a00", booked: "#d93a45" };

export function isDarkTheme(theme: Pick<VenueTheme, "colors">): boolean {
  return luminance(theme.colors.background) < 0.35;
}

export function statusPalette(theme: Pick<VenueTheme, "colors">): StatusPalette {
  return isDarkTheme(theme) ? STATUS_ON_DARK : STATUS_ON_LIGHT;
}

/** CSS varijable kluba koje koriste Tailwind tokeni (brand-*). */
export function themeToCssVars(theme: VenueTheme): Record<`--${string}`, string> {
  const font = FONTS[theme.fontFamily];
  const status = statusPalette(theme);
  return {
    "--brand-primary": theme.colors.primary,
    "--brand-accent": theme.colors.accent,
    "--brand-background": theme.colors.background,
    "--brand-surface": theme.colors.surface,
    "--brand-text": theme.colors.text,
    "--brand-on-primary": readableTextOn(theme.colors.primary),
    "--brand-on-accent": readableTextOn(theme.colors.accent),
    "--brand-font": `var(${font.display}), ${SANS_FALLBACK}`,
    "--brand-body": `var(${font.body}), ${SANS_FALLBACK}`,
    "--brand-display-weight": font.weight,
    "--brand-display-stretch": font.stretch,
    "--brand-display-transform": font.transform,
    "--brand-display-tracking": font.tracking,
    "--brand-display-style": font.style,
    "--status-free": status.free,
    "--status-held": status.held,
    "--status-booked": status.booked,
    "--brand-scheme": isDarkTheme(theme) ? "dark" : "light",
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

/** Boja #RRGGBB s prozirnošću, za canvas. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
