import { describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { createSessionToken, getSessionSecret, verifySessionToken } from "./session";

const secret = "test-secret-0123456789";
const now = new Date("2026-11-14T20:00:00Z");
const later = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

describe("sesija osoblja (pravilo 3)", () => {
  const token = createSessionToken("demo-club", now, secret);

  it("vrijedi za isti klub do isteka (12 h)", () => {
    expect(verifySessionToken(token, "demo-club", later(11.9), secret)).toBe(true);
    expect(verifySessionToken(token, "demo-club", later(12), secret)).toBe(false);
  });

  it("ne vrijedi za drugi klub, drugu tajnu ni prazan token", () => {
    expect(verifySessionToken(token, "demo-club-2", now, secret)).toBe(false);
    expect(verifySessionToken(token, "demo-club", now, "druga-tajna-0123456")).toBe(false);
    expect(verifySessionToken(undefined, "demo-club", now, secret)).toBe(false);
    expect(verifySessionToken("smece", "demo-club", now, secret)).toBe(false);
  });

  it("izmijenjen slug ili istek ruši potpis", () => {
    const [, expires, signature] = token.split(".");
    expect(verifySessionToken(`demo-club-2.${expires}.${signature}`, "demo-club-2", now, secret)).toBe(false);
    expect(verifySessionToken(`demo-club.${Number(expires) + 1e9}.${signature}`, "demo-club", later(13), secret)).toBe(false);
  });

  it("tajna iz okoline ili privremena tajna uz upozorenje", () => {
    expect(getSessionSecret({ ADMIN_SESSION_SECRET: "konfigurirana-tajna-123" })).toBe("konfigurirana-tajna-123");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const generated = getSessionSecret({});
    expect(generated.length).toBeGreaterThanOrEqual(32);
    expect(getSessionSecret({ ADMIN_SESSION_SECRET: "kratka" })).toBe(generated);
    warn.mockRestore();
  });
});

describe("ograničenje pokušaja (pravilo 2)", () => {
  it("blokira nakon 5 pogrešnih u 10 minuta", () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 5; i += 1) {
      expect(limiter.check("demo-club:ip", now).allowed).toBe(true);
      limiter.recordFailure("demo-club:ip", now);
    }
    const blocked = limiter.check("demo-club:ip", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(10 * 60_000);
    expect(limiter.check("demo-club:drugi-ip", now).allowed).toBe(true);
  });

  it("propušta nakon isteka prozora i nakon reseta", () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 5; i += 1) limiter.recordFailure("k", now);
    expect(limiter.check("k", new Date(now.getTime() + 10 * 60_000 + 1)).allowed).toBe(true);
    for (let i = 0; i < 5; i += 1) limiter.recordFailure("k", now);
    limiter.reset("k");
    expect(limiter.check("k", now).allowed).toBe(true);
  });
});
