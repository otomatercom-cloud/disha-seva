import type { NextRequest } from "next/server";
import { clientIp, json, readJson, sameOrigin } from "@/lib/guard";
import { OdooError } from "@/lib/odoo/client";
import { lookupTicket } from "@/lib/odoo/support";
import { rateLimit } from "@/lib/rate-limit";
import { tokenSchema } from "@/lib/validation/support-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden", message: "Request not allowed." });
  // Tight limit: stops anyone guessing tokens.
  const rl = rateLimit(`lookup:${clientIp(req)}`, Number(process.env.LOOKUP_RATE_LIMIT_MAX) || 10, Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60_000);
  if (!rl.allowed) {
    return json(429, { ok: false, error: "rate_limited", message: "Too many attempts. Please try again later." }, { "Retry-After": String(rl.retryAfterSec) });
  }
  const { body, tooLarge } = await readJson(req, 2 * 1024);
  const parsed = !tooLarge && body ? tokenSchema.safeParse(body) : null;
  if (!parsed?.success) return json(422, { ok: false, error: "validation_error", message: "Enter your token like ABCD-EFGH-JKMN." });
  try {
    return json(200, { ok: true, ticket: await lookupTicket(parsed.data.token.toUpperCase()) });
  } catch (err) {
    if (err instanceof OdooError && err.kind === "notfound") {
      return json(404, { ok: false, error: "not_found", message: "We could not find a request with that token. Check it and try again." });
    }
    console.error("[support-lookup] failed:", err instanceof OdooError ? err.kind : "unexpected");
    return json(503, { ok: false, error: "unavailable", message: "Support system unavailable. Please try again shortly." });
  }
}
