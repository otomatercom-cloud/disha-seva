import "server-only";

export const ADMIN_COOKIE = "disha_admin";
export const ADMIN_RESOURCES = ["texts", "items", "events", "applications"] as const;

type Result = { status: number; data: Record<string, unknown> };

/** Call the DISHA admin API in Odoo: server token (Bearer) + the logged-in admin's token. 4xx bodies are passed through. */
export async function adminFetch(method: "GET" | "POST", path: string, opts: { body?: unknown; token?: string; query?: string } = {}): Promise<Result> {
  const base = process.env.ODOO_BASE_URL?.replace(/\/+$/, "");
  const server = process.env.ODOO_API_TOKEN;
  if (!base || !server) return { status: 503, data: { ok: false, error: "not_configured" } };
  const url = new URL(base + path + (opts.query ? `?${opts.query}` : ""));
  if (process.env.ODOO_DATABASE) url.searchParams.set("db", process.env.ODOO_DATABASE);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), Number(process.env.ODOO_ADMIN_TIMEOUT_MS) || 30_000);
  try {
    const res = await fetch(url, {
      method, cache: "no-store", signal: ctl.signal,
      headers: {
        "Content-Type": "application/json", Authorization: `Bearer ${server}`,
        ...(opts.token ? { "X-Admin-Token": opts.token } : {}),
      },
      ...(method === "POST" ? { body: JSON.stringify(opts.body ?? {}) } : {}),
    });
    let data: Record<string, unknown> = {};
    try { data = await res.json(); } catch { /* non-JSON proxy error page */ }
    return { status: res.status, data: Object.keys(data).length ? data : { ok: false, error: "server" } };
  } catch {
    return { status: 502, data: { ok: false, error: "unreachable" } };
  } finally {
    clearTimeout(timer);
  }
}
