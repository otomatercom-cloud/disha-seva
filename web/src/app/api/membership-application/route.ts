import { NextResponse, type NextRequest } from "next/server";
import { OdooError } from "@/lib/odoo/client";
import { createMembershipApplication } from "@/lib/odoo/membership";
import { rateLimit } from "@/lib/rate-limit";
import { submissionSchema } from "@/lib/validation/membership";
import type { SubmitFailure } from "@/types/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 640 * 1024;
const KEY_RE = /^[A-Za-z0-9_-]{16,64}$/;

const fail = (status: number, body: SubmitFailure, extra?: HeadersInit) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

function clientIp(req: NextRequest) {
  // Nginx sets X-Real-IP; only the last hop of X-Forwarded-For is trusted.
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
    "unknown"
  );
}

function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  // Behind Nginx the app sees an internal URL, so compare against the public host Nginx forwards.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host && originUrl.host === host) return true;
  const site = process.env.SITE_URL;
  return !!site && originUrl.origin === new URL(site).origin;
}

export async function POST(req: NextRequest) {
  // CSRF: browsers always send Origin on cross-site POSTs.
  if (!sameOrigin(req)) {
    return fail(403, { ok: false, error: "forbidden", message: "Request not allowed." });
  }

  const max = Number(process.env.RATE_LIMIT_MAX) || 5;
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 10 * 60_000;
  const limit = rateLimit(clientIp(req), max, windowMs);
  if (!limit.allowed) {
    return fail(
      429,
      { ok: false, error: "rate_limited", message: "Too many attempts. Please try again later." },
      { "Retry-After": String(limit.retryAfterSec) },
    );
  }

  const key = req.headers.get("idempotency-key") ?? "";
  if (!KEY_RE.test(key)) {
    return fail(400, { ok: false, error: "validation_error", message: "Invalid request." });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) {
    return fail(413, { ok: false, error: "validation_error", message: "Submission is too large." });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, { ok: false, error: "validation_error", message: "Invalid request." });
  }

  const parsed = submissionSchema.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "_")] ??= issue.message;
    // A filled honeypot gets a generic response, never a field hint.
    if ("website" in fields) {
      return fail(400, { ok: false, error: "validation_error", message: "Invalid request." });
    }
    return fail(422, {
      ok: false, error: "validation_error", message: "Please correct the highlighted fields.", fields,
    });
  }

  try {
    const { website: _honeypot, ...values } = parsed.data;
    const reference = await createMembershipApplication(values, key);
    return NextResponse.json({ ok: true, reference }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof OdooError && err.kind === "rejected") {
      return fail(422, {
        ok: false, error: "validation_error",
        message: "Please correct the highlighted fields.", fields: err.fields,
      });
    }
    // Log the failure class only: never personal data, credentials or Odoo error bodies.
    console.error("[membership-application] failed:", err instanceof OdooError ? err.kind : "unexpected");
    const timeoutOrDown = err instanceof OdooError && (err.kind === "timeout" || err.kind === "network");
    return fail(timeoutOrDown ? 503 : 500, {
      ok: false,
      error: timeoutOrDown ? "unavailable" : "server_error",
      message: timeoutOrDown
        ? "Our membership system is temporarily unavailable. Your details were not saved. Please try again in a few minutes."
        : "Something went wrong and your application was not saved. Please try again.",
    });
  }
}
