import demoClub from "../../data/venues/demo-club.json";
import demoClub2 from "../../data/venues/demo-club-2.json";
import { generateReservationCode } from "../reservations/code";
import { createMemoryServices, type Services } from "./memory";

/** Izvorni podaci klubova (kasnije Supabase). */
export const RAW_VENUES: readonly unknown[] = [demoClub, demoClub2];

const globalKey = Symbol.for("rezervacije.services");
type GlobalWithServices = typeof globalThis & { [globalKey]?: Services };

/** Jedna instanca po procesu; preživi hot reload u razvoju. */
export function services(): Services {
  const holder = globalThis as GlobalWithServices;
  holder[globalKey] ??= createMemoryServices(RAW_VENUES, {
    now: () => new Date(),
    generateCode: () => generateReservationCode(),
  });
  return holder[globalKey];
}
