import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_RESOURCES, adminFetch } from "@/lib/admin/odoo";
import { json, sameOrigin } from "@/lib/guard";

const MAX_BODY = 24 * 1024 * 1024;
type Ctx = { params: Promise<{ res: string }> };

async function handle(req: NextRequest, { params }: Ctx, method: "GET" | "POST") {
  const { res } = await params;
  if (!(ADMIN_RESOURCES as readonly string[]).includes(res)) return json(404, { ok: false, error: "not_found" });
  if (method === "POST" && !sameOrigin(req)) return json(403, { ok: false, error: "forbidden" });
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!token) return json(401, { ok: false, error: "session_expired" });

  let body: unknown;
  if (method === "POST") {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return json(413, { ok: false, error: "too_large" });
    try { body = JSON.parse(raw); } catch { return json(400, { ok: false, error: "invalid" }); }
  }
  const r = await adminFetch(method, `/api/disha/admin/${res}`, { body, token, query: req.nextUrl.searchParams.toString() });
  const out = NextResponse.json(r.data, { status: r.status, headers: { "Cache-Control": "no-store" } });
  if (r.status === 401 && r.data.error === "session_expired") out.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  // A successful edit: show it on the public site straight away instead of waiting for the 30 s refresh.
  if (method === "POST" && r.status === 200 && res !== "applications") revalidatePath("/", "layout");
  return out;
}

export const GET = (req: NextRequest, ctx: Ctx) => handle(req, ctx, "GET");
export const POST = (req: NextRequest, ctx: Ctx) => handle(req, ctx, "POST");
