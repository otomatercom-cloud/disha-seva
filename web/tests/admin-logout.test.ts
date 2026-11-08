import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("admin logout", () => {
  beforeEach(() => { vi.restoreAllMocks(); process.env.ODOO_BASE_URL = "http://odoo.test"; process.env.ODOO_API_TOKEN = "srv"; });
  it("revokes the token in Odoo and clears the cookie", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { POST } = await import("@/app/api/admin/logout/route");
    const req = new NextRequest("http://localhost:3000/api/admin/logout", { method: "POST", headers: { origin: "http://localhost:3000", host: "localhost:3000", cookie: "disha_admin=tok.sig" } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(String(f.mock.calls[0][0])).toContain("/api/disha/admin/logout");
    expect((f.mock.calls[0][1] as RequestInit).headers).toMatchObject({ "X-Admin-Token": "tok.sig" });
    expect(res.headers.get("set-cookie")).toMatch(/disha_admin=;/);
  });
  it("still clears the cookie when Odoo is unreachable, and rejects cross-site calls", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    const { POST } = await import("@/app/api/admin/logout/route");
    const mk = (origin: string) => new NextRequest("http://localhost:3000/api/admin/logout", { method: "POST", headers: { origin, host: "localhost:3000", cookie: "disha_admin=t" } });
    expect((await POST(mk("http://localhost:3000"))).status).toBe(200);
    expect((await POST(mk("https://evil.test"))).status).toBe(403);
  });
});
