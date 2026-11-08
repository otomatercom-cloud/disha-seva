import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, adminFetch } from "@/lib/admin/odoo";
import { json, sameOrigin } from "@/lib/guard";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden" });
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (token) await adminFetch("POST", "/api/disha/admin/logout", { token }); // revoke server-side; the cookie is cleared either way
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
