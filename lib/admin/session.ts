import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Trajanje sesije osoblja (pravilo 3). */
export const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Token oblika "<slug>.<istek ms>.<HMAC potpis>". */
export function createSessionToken(slug: string, now: Date, secret: string, ttlMs = STAFF_SESSION_TTL_MS): string {
  const payload = `${slug}.${now.getTime() + ttlMs}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** Valjan samo za isti klub, prije isteka i s ispravnim potpisom. */
export function verifySessionToken(token: string | undefined, slug: string, now: Date, secret: string): boolean {
  if (!token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = Buffer.from(token.slice(lastDot + 1));
  const expected = Buffer.from(sign(payload, secret));
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return false;

  const separator = payload.lastIndexOf(".");
  const tokenSlug = payload.slice(0, separator);
  const expiresAt = Number(payload.slice(separator + 1));
  return tokenSlug === slug && Number.isFinite(expiresAt) && now.getTime() < expiresAt;
}

let processSecret: string | null = null;

/**
 * Tajna za potpis sesije iz ADMIN_SESSION_SECRET. Bez nje se generira nasumična tajna
 * po procesu (sesije vrijede do restarta, kao i podaci u memoriji) uz upozorenje.
 */
export function getSessionSecret(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const configured = env.ADMIN_SESSION_SECRET;
  if (configured && configured.length >= 16) return configured;
  if (!processSecret) {
    processSecret = randomBytes(32).toString("base64url");
    console.warn("ADMIN_SESSION_SECRET nije postavljen (min. 16 znakova); koristi se privremena tajna do restarta.");
  }
  return processSecret;
}
