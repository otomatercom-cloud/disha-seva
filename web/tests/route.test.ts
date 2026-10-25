import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/membership-application/route";
import { resetRateLimit } from "@/lib/rate-limit";

const TOKEN = "super-secret-token-value";
const KEY = "0123456789abcdef-key";
const body = {
  category: "general", full_name: "Asha Nair", gender: "female", date_of_birth: "1992-04-12", nationality: "Indian",
  mobile: "+966501234567", email: "a@b.co", ksa_region: "Central", ksa_city: "Riyadh", passport_number: "P1234567",
  india_state: "Kerala", india_district: "Thrissur", india_village: "Irinjalakuda", india_pin: "680121",
  india_address: "Nair House", ksa_emergency_name: "Ravi", ksa_emergency_relationship: "Brother",
  ksa_emergency_phone: "+966500000001", india_emergency_name: "Lakshmi", india_emergency_relationship: "Mother",
  india_emergency_phone: "+919847000001", consent: true,
};

function req(payload: unknown = body, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/membership-application", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "idempotency-key": KEY, "x-real-ip": "1.1.1.1", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}
const odooOk = (reference = "DISHA-MEM-00007") =>
  new Response(JSON.stringify({ ok: true, reference, replayed: false }), { status: 201 });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetRateLimit();
  process.env.ODOO_BASE_URL = "https://odoo.example";
  process.env.ODOO_API_TOKEN = TOKEN;
  process.env.RATE_LIMIT_MAX = "5";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("POST /api/membership-application", () => {
  it("returns the reference Odoo generated and forwards token + idempotency key", async () => {
    fetchMock.mockResolvedValue(odooOk());
    const res = await POST(req());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reference: "DISHA-MEM-00007" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://odoo.example/api/disha/membership-application");
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers["Idempotency-Key"]).toBe(KEY);
  });

  it("sends only allowlisted fields to Odoo", async () => {
    fetchMock.mockResolvedValue(odooOk());
    await POST(req({ ...body, state: "approved", is_admin: true }));
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).not.toHaveProperty("state");
    expect(sent).not.toHaveProperty("is_admin");
    expect(sent).not.toHaveProperty("website");
  });

  it("rejects invalid input without calling Odoo", async () => {
    const res = await POST(req({ ...body, email: "bad" }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields.email).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("silently rejects a filled honeypot", async () => {
    const res = await POST(req({ ...body, website: "spam" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin and missing-origin requests", async () => {
    expect((await POST(req(body, { origin: "https://evil.example" }))).status).toBe(403);
    const noOrigin = new NextRequest("http://localhost:3000/api/membership-application", {
      method: "POST", headers: { "idempotency-key": KEY }, body: JSON.stringify(body),
    });
    expect((await POST(noOrigin)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts the public origin forwarded by a reverse proxy, still rejects others", async () => {
    fetchMock.mockResolvedValue(odooOk());
    const proxied = (origin: string) => new NextRequest("http://127.0.0.1:3000/api/membership-application", {
      method: "POST",
      headers: { origin, host: "127.0.0.1:3000", "x-forwarded-host": "disha.example.org", "idempotency-key": KEY },
      body: JSON.stringify(body),
    });
    expect((await POST(proxied("https://disha.example.org"))).status).toBe(200);
    expect((await POST(proxied("https://evil.example"))).status).toBe(403);
  });

  it("requires a valid idempotency key and JSON", async () => {
    expect((await POST(req(body, { "idempotency-key": "short" }))).status).toBe(400);
    expect((await POST(req("{nope"))).status).toBe(400);
  });

  it("turns an Odoo timeout into a safe 503 and never leaks the token", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const res = await POST(req());
    const text = await res.text();
    expect(res.status).toBe(503);
    expect(text).toContain("not saved");
    expect(text).not.toContain(TOKEN);
    expect(text).not.toContain("odoo.example");
  });

  it("hides Odoo server errors", async () => {
    fetchMock.mockResolvedValue(new Response("Traceback secret internals", { status: 500 }));
    const res = await POST(req());
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).not.toContain("Traceback");
  });

  it("maps Odoo 422 to field errors and Odoo 401 to a generic failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, fields: { mobile: "Enter a valid phone number." } }), { status: 422 }));
    const a = await POST(req());
    expect(a.status).toBe(422);
    expect((await a.json()).fields.mobile).toBeTruthy();
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    const b = await POST(req());
    expect(b.status).toBe(500);
    expect(JSON.stringify(await b.json())).not.toContain(TOKEN);
  });

  it("does not report success if Odoo returns no reference", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    expect((await POST(req())).status).toBe(500);
  });

  it("rate limits repeated submissions per IP", async () => {
    fetchMock.mockImplementation(async () => odooOk());
    for (let i = 0; i < 5; i++) expect((await POST(req())).status).toBe(200);
    const res = await POST(req());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect((await POST(req(body, { "x-real-ip": "2.2.2.2" }))).status).toBe(200);
  });
});
