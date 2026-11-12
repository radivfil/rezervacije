"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  normalizeCodeInput,
  type CodeLookupState,
  type LoginFormState,
  type ManualReservationState,
  type StaffActionKind,
  type StaffActionState,
} from "@/lib/admin/form-state";
import { verifyPin } from "@/lib/admin/pin";
import { createRateLimiter, type RateLimiter } from "@/lib/admin/rate-limit";
import { ReservationCodeSchema } from "@/lib/domain/schemas";
import { adminHref, reservationHref, venueHref } from "@/lib/routes";
import { getReservation } from "@/lib/services/reservations";
import { staffCancel, staffCheckIn, staffCreateReservation, staffNoShow } from "@/lib/services/staff";
import { getAdminPinHash } from "@/lib/services/venues";
import { endStaffSession, hasStaffSession, startStaffSession } from "./session";

const limiterKey = Symbol.for("rezervacije.login-limiter");
type GlobalWithLimiter = typeof globalThis & { [limiterKey]?: RateLimiter };

function loginLimiter(): RateLimiter {
  const holder = globalThis as GlobalWithLimiter;
  holder[limiterKey] ??= createRateLimiter();
  return holder[limiterKey];
}

const text = (formData: FormData, name: string): string => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

async function clientKey(slug: string): Promise<string> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? "local";
  return `${slug}:${ip}`;
}

/** Prijava osoblja PIN-om (pravila 1-3). */
export async function loginAction(slug: string, _previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const hash = await getAdminPinHash(slug);
  if (!hash) return { error: "not_found", retryMinutes: 0 };
  const key = await clientKey(slug);
  const limiter = loginLimiter();
  const now = new Date();
  const decision = limiter.check(key, now);
  if (!decision.allowed) return { error: "blocked", retryMinutes: Math.ceil(decision.retryAfterMs / 60_000) };

  if (!verifyPin(text(formData, "pin").trim(), hash)) {
    limiter.recordFailure(key, now);
    const after = limiter.check(key, now);
    return after.allowed
      ? { error: "wrong_pin", retryMinutes: 0 }
      : { error: "blocked", retryMinutes: Math.ceil(after.retryAfterMs / 60_000) };
  }
  limiter.reset(key);
  await startStaffSession(slug);
  redirect(adminHref(slug));
}

export async function logoutAction(slug: string): Promise<void> {
  await endStaffSession(slug);
  redirect(venueHref(slug));
}

const STAFF_ACTIONS = {
  checkIn: staffCheckIn,
  noShow: staffNoShow,
  cancel: staffCancel,
} as const satisfies Record<StaffActionKind, unknown>;

const isStaffActionKind = (value: string): value is StaffActionKind => value in STAFF_ACTIONS;

/** Check-in, no-show ili otkazivanje (pravila 5-7); svaka akcija sama provjerava sesiju. */
export async function staffAction(
  slug: string,
  code: string,
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  if (!(await hasStaffSession(slug))) return { error: "unauthorized", done: null };
  const kind = text(formData, "action");
  const parsedCode = ReservationCodeSchema.safeParse(code);
  if (!isStaffActionKind(kind) || !parsedCode.success) return { error: "not_found", done: null };
  const result = await STAFF_ACTIONS[kind](slug, parsedCode.data);
  if (!result.ok) return { error: result.error, done: null };
  revalidatePath(venueHref(slug), "layout");
  return { error: null, done: kind };
}

/** Ručna rezervacija osoblja (pravilo 8). */
export async function staffCreateAction(
  slug: string,
  _previous: ManualReservationState,
  formData: FormData,
): Promise<ManualReservationState> {
  if (!(await hasStaffSession(slug))) return { error: "unauthorized", fields: [], createdCode: null };
  const result = await staffCreateReservation(slug, {
    tableId: text(formData, "tableId"),
    date: text(formData, "date"),
    kind: text(formData, "kind"),
    partySize: text(formData, "partySize"),
    guestName: text(formData, "guestName"),
    guestPhone: text(formData, "guestPhone"),
  });
  if (!result.ok) {
    return result.error === "invalid"
      ? { error: null, fields: result.fields, createdCode: null }
      : { error: result.error, fields: [], createdCode: null };
  }
  revalidatePath(venueHref(slug), "layout");
  return { error: null, fields: [], createdCode: result.code };
}

/** Ručni unos koda vodi na stranicu rezervacije (gdje osoblje označava dolazak). */
export async function lookupCodeAction(slug: string, _previous: CodeLookupState, formData: FormData): Promise<CodeLookupState> {
  if (!(await hasStaffSession(slug))) redirect(adminHref(slug));
  const parsed = ReservationCodeSchema.safeParse(normalizeCodeInput(text(formData, "code")));
  if (!parsed.success || !(await getReservation(slug, parsed.data))) return { error: "code_not_found" };
  redirect(reservationHref(slug, parsed.data));
}
