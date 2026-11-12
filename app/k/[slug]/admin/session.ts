import { cookies } from "next/headers";
import { createSessionToken, getSessionSecret, STAFF_SESSION_TTL_MS, verifySessionToken } from "@/lib/admin/session";
import { venueHref } from "@/lib/routes";

/** Kolačić je ograničen na putanju kluba, pa sesija jednog kluba ne vrijedi za drugi. */
const COOKIE_NAME = "staff_session";

export async function hasStaffSession(slug: string): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return verifySessionToken(token, slug, new Date(), getSessionSecret());
}

export async function startStaffSession(slug: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, createSessionToken(slug, new Date(), getSessionSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ADMIN_COOKIE_INSECURE !== "1",
    path: venueHref(slug),
    maxAge: STAFF_SESSION_TTL_MS / 1000,
  });
}

export async function endStaffSession(slug: string): Promise<void> {
  (await cookies()).delete({ name: COOKIE_NAME, path: venueHref(slug) });
}
