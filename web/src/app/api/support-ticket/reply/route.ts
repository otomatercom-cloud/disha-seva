import type { NextRequest } from "next/server";
import { clientIp, json, readJson, sameOrigin } from "@/lib/guard";
import { OdooError } from "@/lib/odoo/client";
import { replyTicket } from "@/lib/odoo/support";
import { rateLimit } from "@/lib/rate-limit";
import { replySchema } from "@/lib/validation/support-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden", message: "Request not allowed." });
  const rl = rateLimit(`reply:${clientIp(req)}`, Number(process.env.REPLY_RATE_LIMIT_MAX) || 10, Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60_000);
  if (!rl.allowed) {
    return json(429, { ok: false, error: "rate_limited", message: "Too many messages. Please try again later." }, { "Retry-After": String(rl.retryAfterSec) });
  }
  const { body, tooLarge } = await readJson(req, 16 * 1024);
  if (tooLarge) return json(413, { ok: false, error: "validation_error", message: "Message is too long." });
  const parsed = body ? replySchema.safeParse(body) : null;
  if (!parsed?.success) return json(422, { ok: false, error: "validation_error", message: "Write a message of up to 4000 characters." });
  try {
    return json(200, { ok: true, ticket: await replyTicket(parsed.data.token.toUpperCase(), parsed.data.message) });
  } catch (err) {
    if (err instanceof OdooError && err.kind === "notfound") return json(404, { ok: false, error: "not_found", message: "Ticket not found." });
    if (err instanceof OdooError && err.kind === "conflict") return json(409, { ok: false, error: "closed", message: "This request is closed. Please open a new one." });
    console.error("[support-reply] failed:", err instanceof OdooError ? err.kind : "unexpected");
    return json(503, { ok: false, error: "unavailable", message: "Support system unavailable. Please try again shortly." });
  }
}
