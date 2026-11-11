import { Inter, Playfair_Display } from "next/font/google";

/** Fontovi dostupni klubovima (vidi lib/theme FONT_VARIABLES). */
export const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
export const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

export const fontVariables = `${inter.variable} ${playfair.variable}`;
