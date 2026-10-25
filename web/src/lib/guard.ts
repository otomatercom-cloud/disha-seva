import { NextResponse, type NextRequest } from "next/server";

/** Shared request guards for the public API routes. */
export const json = (status: number, body: unknown, extra?: HeadersInit) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", ...extra } });

export function clientIp(req: NextRequest) {
  // Nginx sets X-Real-IP; only the last hop of X-Forwarded-For is trusted.
  return req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "unknown";
}

/** CSRF: browsers always send Origin on cross-site POSTs. Compare with the public host Nginx forwards. */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return false;
  }
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host && originUrl.host === host) return true;
  const site = process.env.SITE_URL;
  return !!site && originUrl.origin === new URL(site).origin;
}

/** Read a small JSON body. Returns null when too large / not an object. */
export async function readJson(req: NextRequest, maxBytes: number): Promise<{ body: Record<string, unknown> | null; tooLarge: boolean }> {
  const raw = await req.text();
  if (raw.length > maxBytes) return { body: null, tooLarge: true };
  try {
    const data = JSON.parse(raw);
    return { body: data && typeof data === "object" && !Array.isArray(data) ? data : null, tooLarge: false };
  } catch {
    return { body: null, tooLarge: false };
  }
}
