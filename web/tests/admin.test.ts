import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { themeCss } from "@/lib/theme";
import { resetRateLimit } from "@/lib/rate-limit";

describe("themeCss", () => {
  it("emits only valid #rrggbb colours", () => {
    const css = themeCss((k) => ({ "theme.primary": "#112233", "theme.dark": "red; } body{display:none", "theme.accent": "" }[k] ?? ""));
    expect(css).toBe(":root{--color-navy-700:#112233;--color-seva-700:#112233}");
  });
  it("is empty when nothing is set", () => expect(themeCss(() => "")).toBe(""));
});

const origin = "http://localhost:3000";
const req = (url: string, init: { method?: string; body?: unknown; cookie?: string; origin?: string | null } = {}) =>
  new NextRequest(origin + url, {
    method: init.method ?? "POST",
    headers: { ...(init.origin === null ? {} : { origin: init.origin ?? origin }), host: "localhost:3000", "content-type": "application/json", ...(init.cookie ? { cookie: init.cookie } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });

describe("admin routes", () => {
  beforeEach(() => {
    resetRateLimit();
    process.env.ODOO_BASE_URL = "http://odoo.test"; process.env.ODOO_API_TOKEN = "srv";
    vi.restoreAllMocks();
  });

  it("login sets an httpOnly cookie on success and nothing on failure", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, token: "T.sig", name: "Ann", expires_in: 100 }), { status: 200 }));
    const ok = await POST(req("/api/admin/login", { body: { login: "a", password: "b" } }));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("set-cookie")).toMatch(/disha_admin=T\.sig.*HttpOnly.*SameSite=strict/i);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401 }));
    const bad = await POST(req("/api/admin/login", { body: { login: "a", password: "x" } }));
    expect(bad.status).toBe(401);
    expect(bad.headers.get("set-cookie")).toBeNull();
  });

  it("login rejects cross-site requests and rate-limits", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    expect((await POST(req("/api/admin/login", { body: {}, origin: "https://evil.test" }))).status).toBe(403);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false }), { status: 401 }));
    for (let i = 0; i < 8; i++) await POST(req("/api/admin/login", { body: { login: "a", password: "b" } }));
    expect((await POST(req("/api/admin/login", { body: { login: "a", password: "b" } }))).status).toBe(429);
  });

  it("proxy needs the cookie, same origin and a known resource; forwards both tokens", async () => {
    const { GET, POST } = await import("@/app/api/admin/[res]/route");
    const ctx = (res: string) => ({ params: Promise.resolve({ res }) });
    expect((await GET(req("/api/admin/texts", { method: "GET" }), ctx("texts"))).status).toBe(401);
    expect((await GET(req("/api/admin/secrets", { method: "GET", cookie: "disha_admin=T" }), ctx("secrets"))).status).toBe(404);
    expect((await POST(req("/api/admin/texts", { body: {}, cookie: "disha_admin=T", origin: null }), ctx("texts"))).status).toBe(403);
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, texts: [] }), { status: 200 }));
    const ok = await GET(req("/api/admin/texts", { method: "GET", cookie: "disha_admin=T" }), ctx("texts"));
    expect(ok.status).toBe(200);
    const h = (f.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer srv"); expect(h["X-Admin-Token"]).toBe("T");
  });
});

describe("login diagnostics", () => {
  it("reports the real set-up problem", async () => {
    const { POST } = await import("@/app/api/admin/login/route");
    const cases: [number, Record<string, unknown>, string][] = [
      [401, { error: "unauthorized" }, "token_mismatch"], [404, {}, "module_missing"], [403, { error: "forbidden" }, "forbidden"],
    ];
    for (const [status, body, code] of cases) {
      resetRateLimit();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
      const r = await POST(req("/api/admin/login", { body: { login: "a", password: "b" } }));
      expect((await r.json()).error).toBe(code);
    }
    resetRateLimit();
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("ECONNREFUSED"));
    expect((await (await POST(req("/api/admin/login", { body: { login: "a", password: "b" } }))).json()).error).toBe("unreachable");
  });
});
