import { Archivo, IBM_Plex_Mono, Inter, Playfair_Display } from "next/font/google";

/** Fontovi dostupni klubovima (vidi lib/theme FONTS). Archivo je ujedno font teksta sučelja. */
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});
export const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});
export const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});
/** Kodovi rezervacija i odbrojavanje. */
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
  preload: false,
});

export const fontVariables = `${archivo.variable} ${inter.variable} ${playfair.variable} ${plexMono.variable}`;
