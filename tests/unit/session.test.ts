import { describe, it, expect } from "vitest";
import {
  encodeSession,
  decodeSession,
  buildSessionCookie,
  clearSessionCookie,
  getSessionFromCookies,
  SESSION_COOKIE,
  FAKE_SESSION,
} from "@/lib/auth/session";

// ── encode / decode ───────────────────────────────────────────────────────────
describe("encodeSession / decodeSession", () => {
  it("round-trips a SessionContext", () => {
    const encoded = encodeSession(FAKE_SESSION);
    const decoded = decodeSession(encoded);
    expect(decoded).toEqual(FAKE_SESSION);
  });

  it("encodeSession returns a base64 string (no spaces, no JSON braces)", () => {
    const encoded = encodeSession(FAKE_SESSION);
    expect(encoded).not.toContain("{");
    expect(encoded).not.toContain(" ");
    expect(Buffer.from(encoded, "base64").toString("utf-8")).toContain(
      FAKE_SESSION.user.email
    );
  });

  it("decodeSession returns null for invalid base64", () => {
    expect(decodeSession("not-valid-base64!!!")).toBeNull();
  });

  it("decodeSession returns null for valid base64 that is not JSON", () => {
    const raw = Buffer.from("plain text").toString("base64");
    expect(decodeSession(raw)).toBeNull();
  });
});

// ── buildSessionCookie ────────────────────────────────────────────────────────
describe("buildSessionCookie", () => {
  it("sets HttpOnly and SameSite=Lax", () => {
    const cookie = buildSessionCookie(FAKE_SESSION);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
  });

  it("sets Path=/", () => {
    const cookie = buildSessionCookie(FAKE_SESSION);
    expect(cookie).toContain("Path=/");
  });

  it("sets Max-Age=604800", () => {
    const cookie = buildSessionCookie(FAKE_SESSION);
    expect(cookie).toContain("Max-Age=604800");
  });

  it("cookie name matches SESSION_COOKIE constant", () => {
    const cookie = buildSessionCookie(FAKE_SESSION);
    expect(cookie.startsWith(`${SESSION_COOKIE}=`)).toBe(true);
  });
});

// ── clearSessionCookie ────────────────────────────────────────────────────────
describe("clearSessionCookie", () => {
  it("sets Max-Age=0 to expire the cookie", () => {
    const cookie = clearSessionCookie();
    expect(cookie).toContain("Max-Age=0");
  });

  it("sets empty value", () => {
    const cookie = clearSessionCookie();
    expect(cookie).toMatch(new RegExp(`${SESSION_COOKIE}=;`));
  });
});

// ── getSessionFromCookies ─────────────────────────────────────────────────────
describe("getSessionFromCookies", () => {
  it("returns null when cookieHeader is null", async () => {
    const session = await getSessionFromCookies(null);
    expect(session).toBeNull();
  });

  it("returns null when session cookie is absent", async () => {
    const session = await getSessionFromCookies("other_cookie=value");
    expect(session).toBeNull();
  });

  it("returns the decoded session when the cookie is present", async () => {
    const encoded = encodeSession(FAKE_SESSION);
    const header = `${SESSION_COOKIE}=${encoded}`;
    const session = await getSessionFromCookies(header);
    expect(session).toEqual(FAKE_SESSION);
  });

  it("handles multiple cookies, picking the right one", async () => {
    const encoded = encodeSession(FAKE_SESSION);
    const header = `other=abc; ${SESSION_COOKIE}=${encoded}; another=xyz`;
    const session = await getSessionFromCookies(header);
    expect(session).toEqual(FAKE_SESSION);
  });

  it("returns null when session cookie value is corrupted", async () => {
    const header = `${SESSION_COOKIE}=!!!invalid!!!`;
    const session = await getSessionFromCookies(header);
    expect(session).toBeNull();
  });
});
