import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as CREATE } from "@/app/api/support-ticket/route";
import { POST as LOOKUP } from "@/app/api/support-ticket/lookup/route";
import { POST as REPLY } from "@/app/api/support-ticket/reply/route";
import { SupportForm } from "@/components/forms/support-form";
import { TrackForm } from "@/components/forms/track-form";
import { resetRateLimit } from "@/lib/rate-limit";
import { replySchema, supportSubmissionSchema, tokenSchema } from "@/lib/validation/support-ticket";

const TOKEN = "ABCD-EFGH-JKMN";
const KEY = "0123456789abcdef-key";
const valid = {
  requester_name: "Asha Nair", email: "Asha@Example.com", mobile: "+966 50 123 4567", city: "Riyadh",
  category: "visa", urgency: "normal", subject: "Visa expired", description: "My visa expired.", consent: true,
};
const ticket = {
  reference: "DISHA-TKT-00001", subject: "Visa expired", category: "Visa", status: "In Progress", status_code: "in_progress",
  priority: "Normal", created: "2026-10-24 10:00:00", updated: "2026-10-24 11:00:00", description: "My visa expired.",
  can_reply: true, messages: [{ author: "DISHA Support Team", body: "Send passport copy", date: "2026-10-24 11:00:00" }],
};

function req(path: string, payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000", host: "localhost:3000", "x-real-ip": "2.2.2.2", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetRateLimit();
  process.env.ODOO_BASE_URL = "https://odoo.example";
  process.env.ODOO_API_TOKEN = "secret-api-token";
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());
const odoo = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

describe("validation", () => {
  it("normalises and accepts a valid ticket", () => {
    const r = supportSubmissionSchema.safeParse(valid);
    expect(r.success && r.data.email).toBe("asha@example.com");
  });
  it("rejects bad category/urgency/phone/consent/honeypot", () => {
    for (const patch of [{ category: "x" }, { urgency: "x" }, { mobile: "12" }, { consent: false }, { subject: "" }, { website: "bot" }]) {
      expect(supportSubmissionSchema.safeParse({ ...valid, ...patch }).success, JSON.stringify(patch)).toBe(false);
    }
  });
  it("token format", () => {
    expect(tokenSchema.safeParse({ token: TOKEN }).success).toBe(true);
    expect(tokenSchema.safeParse({ token: "abcd-efgh-jkmn" }).success).toBe(true);
    for (const t of ["", "ABCD", "ABCD-EFGH-JKM0", "' OR 1=1 --", "DISHA-TKT-00001"]) expect(tokenSchema.safeParse({ token: t }).success).toBe(false);
    expect(replySchema.safeParse({ token: TOKEN, message: "" }).success).toBe(false);
  });
});

describe("POST /api/support-ticket", () => {
  it("creates a ticket and returns reference + token once", async () => {
    fetchMock.mockResolvedValue(odoo({ ok: true, reference: "DISHA-TKT-00001", token: TOKEN, priority: "Normal" }));
    const res = await CREATE(req("/api/support-ticket", valid, { "idempotency-key": KEY }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, reference: "DISHA-TKT-00001", token: TOKEN, priority: "Normal" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://odoo.example/api/disha/support/ticket");
    expect(init.headers["Idempotency-Key"]).toBe(KEY);
    expect(init.headers.Authorization).toBe("Bearer secret-api-token");
    expect(JSON.parse(init.body)).not.toHaveProperty("website");
  });
  it("blocks cross-origin, missing key, invalid data and honeypot without calling Odoo", async () => {
    expect((await CREATE(req("/api/support-ticket", valid, { origin: "https://evil.example", "idempotency-key": KEY }))).status).toBe(403);
    expect((await CREATE(req("/api/support-ticket", valid))).status).toBe(400);
    expect((await CREATE(req("/api/support-ticket", { ...valid, email: "x" }, { "idempotency-key": KEY }))).status).toBe(422);
    expect((await CREATE(req("/api/support-ticket", { ...valid, website: "bot" }, { "idempotency-key": KEY }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never reports success when Odoo fails and never leaks details", async () => {
    fetchMock.mockResolvedValue(odoo({ boom: "traceback secret" }, 500));
    const res = await CREATE(req("/api/support-ticket", valid, { "idempotency-key": KEY }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/traceback|secret/);
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect((await CREATE(req("/api/support-ticket", valid, { "idempotency-key": KEY }))).status).toBe(503);
  });
  it("rate limits", async () => {
    fetchMock.mockResolvedValue(odoo({ ok: true, reference: "R", token: TOKEN }));
    let last = 200;
    for (let i = 0; i < 6; i++) last = (await CREATE(req("/api/support-ticket", valid, { "idempotency-key": KEY }))).status;
    expect(last).toBe(429);
  });
});

describe("lookup / reply routes", () => {
  it("lookup returns ticket, 404 for unknown token, 422 for malformed", async () => {
    fetchMock.mockResolvedValueOnce(odoo({ ok: true, ticket }));
    const ok = await LOOKUP(req("/api/support-ticket/lookup", { token: "abcd-efgh-jkmn" }));
    expect((await ok.json()).ticket.reference).toBe("DISHA-TKT-00001");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).token).toBe(TOKEN); // upper-cased
    fetchMock.mockResolvedValueOnce(odoo({ ok: false, error: "not_found" }, 404));
    expect((await LOOKUP(req("/api/support-ticket/lookup", { token: "AAAA-BBBB-CCCC" }))).status).toBe(404);
    expect((await LOOKUP(req("/api/support-ticket/lookup", { token: "nope" }))).status).toBe(422);
  });
  it("lookup is rate limited to stop token guessing", async () => {
    fetchMock.mockResolvedValue(odoo({ ok: false }, 404));
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await LOOKUP(req("/api/support-ticket/lookup", { token: "AAAA-BBBB-CCCC" }))).status;
    expect(last).toBe(429);
  });
  it("reply works, handles closed tickets", async () => {
    fetchMock.mockResolvedValueOnce(odoo({ ok: true, ticket }));
    expect((await REPLY(req("/api/support-ticket/reply", { token: TOKEN, message: "Done" }))).status).toBe(200);
    fetchMock.mockResolvedValueOnce(odoo({ ok: false, error: "closed" }, 409));
    expect((await REPLY(req("/api/support-ticket/reply", { token: TOKEN, message: "Done" }))).status).toBe(409);
    expect((await REPLY(req("/api/support-ticket/reply", { token: TOKEN, message: "" }))).status).toBe(422);
  });
});

describe("UI", () => {
  it("shows the token exactly once after submitting", async () => {
    fetchMock.mockResolvedValue(odoo({ ok: true, reference: "DISHA-TKT-00009", token: TOKEN, priority: "High" }));
    const user = userEvent.setup();
    render(<SupportForm />);
    await user.selectOptions(screen.getByLabelText(/what do you need help with/i), "visa");
    await user.selectOptions(screen.getByLabelText(/how urgent/i), "high");
    await user.type(screen.getByLabelText(/short title/i), "Visa expired");
    await user.type(screen.getByLabelText(/describe the problem/i), "My visa expired last week");
    await user.type(screen.getByLabelText(/your name/i), "Asha Nair");
    await user.type(screen.getByLabelText(/mobile/i), "+966501234567");
    await user.type(screen.getByLabelText(/^email/i), "asha@example.com");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /submit request/i }));
    expect(await screen.findByTestId("token")).toHaveTextContent(TOKEN);
    expect(screen.getByTestId("reference")).toHaveTextContent("DISHA-TKT-00009");
    expect(screen.getByText(/save this token now/i)).toBeInTheDocument();
  });
  it("blocks submit and shows errors for an empty form", async () => {
    render(<SupportForm />);
    await userEvent.click(screen.getByRole("button", { name: /submit request/i }));
    expect(await screen.findAllByText(/required|choose/i)).not.toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("tracks by token and shows status + replies; wrong token shows an error", async () => {
    fetchMock.mockResolvedValueOnce(odoo({ ok: false, error: "not_found", message: "We could not find a request with that token." }, 404));
    const user = userEvent.setup();
    render(<TrackForm />);
    await user.type(screen.getByLabelText(/tracking token/i), "AAAA-BBBB-CCCC");
    await user.click(screen.getByRole("button", { name: /find my request/i }));
    expect(await screen.findByText(/could not find/i)).toBeInTheDocument();
    fetchMock.mockResolvedValueOnce(odoo({ ok: true, ticket }));
    await user.clear(screen.getByLabelText(/tracking token/i));
    await user.type(screen.getByLabelText(/tracking token/i), TOKEN);
    await user.click(screen.getByRole("button", { name: /find my request/i }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("In Progress"));
    expect(screen.getByText("Send passport copy")).toBeInTheDocument();
    expect(screen.queryByText(/@example/)).toBeNull();
  });
});
