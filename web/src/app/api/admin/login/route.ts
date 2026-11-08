import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminFetch } from "@/lib/admin/odoo";
import { clientIp, json, readJson, sameOrigin } from "@/lib/guard";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden" });
  const rl = rateLimit(`admin-login:${clientIp(req)}`, 8, 10 * 60_000);
  if (!rl.allowed) return json(429, { ok: false, error: "too_many" }, { "Retry-After": String(rl.retryAfterSec) });
  const { body } = await readJson(req, 2000);
  if (!body || typeof body.login !== "string" || typeof body.password !== "string") return json(400, { ok: false, error: "invalid" });
  const r = await adminFetch("POST", "/api/disha/admin/login", { body: { login: body.login, password: body.password } });
  if (r.status !== 200 || typeof r.data.token !== "string") {
    // 424 (not 5xx): Cloudflare replaces 5xx bodies with its own HTML page, which would hide the reason.
    // Tell the admin exactly what is wrong with the set-up (no secrets are included).
    const e = String(r.data.error ?? "");
    if (e === "invalid_credentials") return json(401, { ok: false, error: "invalid_credentials" });
    if (e === "forbidden") return json(403, { ok: false, error: "forbidden" });
    if (e === "not_configured") return json(424, { ok: false, error: "not_configured" });
    if (e === "unauthorized") return json(424, { ok: false, error: "token_mismatch" });
    if (e === "unreachable") return json(424, { ok: false, error: "unreachable" });
    if (r.status === 404) return json(424, { ok: false, error: "module_missing" });
    return json(424, { ok: false, error: "odoo_error" });
  }
  const res = NextResponse.json({ ok: true, name: r.data.name }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(ADMIN_COOKIE, r.data.token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: Number(r.data.expires_in) || 28800,
  });
  return res;
}
