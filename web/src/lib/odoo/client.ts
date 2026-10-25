import "server-only";

export class OdooError extends Error {
  constructor(
    public readonly kind: "timeout" | "network" | "unauthorized" | "rejected" | "notfound" | "conflict" | "server",
    public readonly status?: number,
    public readonly fields?: Record<string, string>,
  ) {
    super(kind);
  }
}

function config() {
  const base = process.env.ODOO_BASE_URL?.replace(/\/+$/, "");
  const token = process.env.ODOO_API_TOKEN;
  if (!base || !token) throw new OdooError("server");
  return {
    base,
    token,
    database: process.env.ODOO_DATABASE || "",
    timeout: Number(process.env.ODOO_TIMEOUT_MS) || 10_000,
  };
}

/** POST JSON to the DISHA Odoo API. Credentials stay on the server; Odoo errors are normalised. */
export async function odooGet<T>(path: string): Promise<{ status: number; data: T }> {
  return odooRequest<T>("GET", path, undefined, {});
}

export async function odooPost<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; data: T }> {
  return odooRequest<T>("POST", path, body, headers);
}

async function odooRequest<T>(
  method: "GET" | "POST",
  path: string,
  body: unknown,
  headers: Record<string, string>,
): Promise<{ status: number; data: T }> {
  const { base, token, database, timeout } = config();
  const url = new URL(base + path);
  if (database) url.searchParams.set("db", database);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...headers },
      ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
      cache: "no-store",
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON error page from a proxy */
    }
    if (res.status === 401 || res.status === 503) throw new OdooError("unauthorized", res.status);
    if (res.status === 422) {
      const fields = (data as { fields?: Record<string, string> } | null)?.fields;
      throw new OdooError("rejected", 422, fields);
    }
    if (res.status === 404) throw new OdooError("notfound", 404);
    if (res.status === 409) throw new OdooError("conflict", 409);
    if (!res.ok || !data) throw new OdooError("server", res.status);
    return { status: res.status, data: data as T };
  } catch (err) {
    if (err instanceof OdooError) throw err;
    if (err instanceof Error && err.name === "AbortError") throw new OdooError("timeout");
    throw new OdooError("network");
  } finally {
    clearTimeout(timer);
  }
}
