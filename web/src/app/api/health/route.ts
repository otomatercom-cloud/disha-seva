import { NextResponse } from "next/server";
import { OdooError } from "@/lib/odoo/client";
import { odooGet } from "@/lib/odoo/client";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for Nginx / uptime monitors: `GET /api/health` never touches Odoo.
 * `GET /api/health?odoo=1` also checks the Odoo connection + token and reports only a status word
 * (never URLs, tokens or Odoo error bodies), so it is safe to expose.
 */
export async function GET(req: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.get("odoo") !== "1") return NextResponse.json({ ok: true }, { headers });
  try {
    await odooGet("/api/disha/health");
    return NextResponse.json({ ok: true, odoo: "connected" }, { headers });
  } catch (err) {
    const kind = err instanceof OdooError ? err.kind : "unexpected";
    return NextResponse.json({ ok: false, odoo: kind }, { status: 503, headers });
  }
}
