import type { NextRequest } from "next/server";
import { clientIp, json, readJson, sameOrigin } from "@/lib/guard";
import { OdooError } from "@/lib/odoo/client";
import { registerForEvent } from "@/lib/odoo/event";
import { rateLimit } from "@/lib/rate-limit";
import { eventRegistrationSchema } from "@/lib/validation/event-registration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json(403, { ok: false, error: "forbidden" });
  const max = Number(process.env.RATE_LIMIT_MAX) || 5;
  const limit = rateLimit(`event-reg:${clientIp(req)}`, max * 2, Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60_000);
  if (!limit.allowed) return json(429, { ok: false, error: "rate_limited" }, { "Retry-After": String(limit.retryAfterSec) });

  const { body, tooLarge } = await readJson(req, 4096);
  if (tooLarge || !body) return json(400, { ok: false, error: "invalid" });
  const parsed = eventRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0] ?? "_")] ??= i.message;
    if ("website" in fields) return json(200, { ok: true, reference: "REG-00000" }); // bot: pretend success
    return json(422, { ok: false, error: "validation_error", fields });
  }
  try {
    const reference = await registerForEvent(parsed.data);
    return json(200, { ok: true, reference });
  } catch (e) {
    if (e instanceof OdooError) {
      if (e.kind === "rejected") return json(422, { ok: false, error: "validation_error", fields: e.fields ?? {} });
      if (e.kind === "conflict") return json(409, { ok: false, error: e.fields?._ ?? "closed" });
      if (e.kind === "notfound") return json(404, { ok: false, error: "closed" });
    }
    return json(503, { ok: false, error: "unavailable" });
  }
}
