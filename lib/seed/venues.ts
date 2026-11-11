import type { Venue } from "../domain/types";

export interface VenueSeedConfig {
  venue: Venue;
  promoterNames: readonly string[];
  reservationCount: number;
  randomSeed: number;
}

export const DEMO_CLUB: VenueSeedConfig = {
  venue: {
    id: "demo-club",
    slug: "demo-club",
    name: "Demo Club",
    locale: "hr-HR",
    currency: "EUR",
    timezone: "Europe/Zagreb",
    theme: {
      logoUrl: "/venues/demo-club/logo.svg",
      colors: {
        primary: "#7c3aed",
        accent: "#22d3ee",
        background: "#0b0a14",
        surface: "#17152a",
        text: "#f5f3ff",
      },
      fontFamily: "Inter",
    },
    policy: { freeCancellationHours: 48 },
  },
  promoterNames: ["Promotor Alfa", "Promotor Beta", "Promotor Gama"],
  reservationCount: 40,
  randomSeed: 20261111,
};

export const DEMO_CLUB_2: VenueSeedConfig = {
  venue: {
    id: "demo-club-2",
    slug: "demo-club-2",
    name: "Lanterna Lounge",
    locale: "hr-HR",
    currency: "EUR",
    timezone: "Europe/Zagreb",
    theme: {
      logoUrl: "/venues/demo-club-2/logo.svg",
      colors: {
        primary: "#d97706",
        accent: "#10b981",
        background: "#fdf8f0",
        surface: "#ffffff",
        text: "#1c1917",
      },
      fontFamily: "Playfair Display",
    },
    policy: { freeCancellationHours: 24 },
  },
  promoterNames: ["Promotor Delta", "Promotor Epsilon"],
  reservationCount: 25,
  randomSeed: 424242,
};

export const SEED_VENUES: readonly VenueSeedConfig[] = [DEMO_CLUB, DEMO_CLUB_2];
