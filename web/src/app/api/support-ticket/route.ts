import type { NextRequest } from "next/server";
import { clientIp, json, readJson, sameOrigin } from "@/lib/guard";
import { OdooError } from "@/lib/odoo/client";
import { createTicket } from "@/lib/odoo/support";
import { rateLimit } from "@/lib/rate-limit";
import { supportSubmissionSchema } from "@/lib/validation/support-ticket";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden", message: "Request not allowed." });
  const rl = rateLimit(`ticket:${clientIp(req)}`, Number(process.env.TICKET_RATE_LIMIT_MAX) || 5, Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60_000);
  if (!rl.allowed) {
    return json(429, { ok: false, error: "rate_limited", message: "Too many requests. Please try again later." }, { "Retry-After": String(rl.retryAfterSec) });
  }
  const key = req.headers.get("idempotency-key") ?? "";
  if (!KEY_RE.test(key)) return json(400, { ok: false, error: "validation_error", message: "Invalid request." });

  const { body, tooLarge } = await readJson(req, 32 * 1024);
  if (tooLarge) return json(413, { ok: false, error: "validation_error", message: "Submission is too large." });
  if (!body) return json(400, { ok: false, error: "validation_error", message: "Invalid request." });

  const parsed = supportSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "_")] ??= issue.message;
    if ("website" in fields) return json(400, { ok: false, error: "validation_error", message: "Invalid request." });
    return json(422, { ok: false, error: "validation_error", message: "Please correct the highlighted fields.", fields });
  }
  try {
    const { website: _h, ...values } = parsed.data;
    const t = await createTicket(values, key);
    return json(200, { ok: true, reference: t.reference, token: t.token, priority: t.priority });
  } catch (err) {
    if (err instanceof OdooError && err.kind === "rejected") {
      return json(422, { ok: false, error: "validation_error", message: "Please correct the highlighted fields.", fields: err.fields });
    }
    console.error("[support-ticket] failed:", err instanceof OdooError ? err.kind : "unexpected");
    const down = err instanceof OdooError && (err.kind === "timeout" || err.kind === "network");
    return json(down ? 503 : 500, {
      ok: false, error: down ? "unavailable" : "server_error",
      message: down ? "Our support system is temporarily unavailable. Your request was not saved. Please try again in a few minutes."
        : "Something went wrong and your request was not saved. Please try again.",
    });
  }
}
