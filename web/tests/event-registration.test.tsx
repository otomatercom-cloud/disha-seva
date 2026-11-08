import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EventRegister, type RegLabels } from "@/components/sections/event-register";
import { buildContent } from "@/lib/content";
import { resetRateLimit } from "@/lib/rate-limit";
import { eventRegistrationSchema } from "@/lib/validation/event-registration";

const labels: RegLabels = { button: "Register", title: "Register for this event", intro: "Intro", name: "Full name", phone: "Phone number", email: "Email address", region: "Province", place: "Place", submit: "Confirm", success: "You are registered. Your reference is", duplicate: "Already registered", closed: "Closed" };

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

describe("schema", () => {
  const ok = { event_id: "4", name: " Ann Lee ", phone: "+966 55 123 4567", email: "Ann@X.test", region: "central", place: "Riyadh" };
  it("cleans and accepts valid input", () => {
    const r = eventRegistrationSchema.parse(ok);
    expect(r).toMatchObject({ event_id: 4, name: "Ann Lee", email: "ann@x.test" });
  });
  it("rejects bad phone, province and a filled honeypot", () => {
    expect(eventRegistrationSchema.safeParse({ ...ok, phone: "abc" }).success).toBe(false);
    expect(eventRegistrationSchema.safeParse({ ...ok, region: "mars" }).success).toBe(false);
    expect(eventRegistrationSchema.safeParse({ ...ok, website: "http://spam" }).success).toBe(false);
  });
});

describe("content", () => {
  it("exposes the event id and registration state", () => {
    const c = buildContent({ events: [{ title: "Camp", date: "2099-01-01", id: 7, registration: "open" }, { title: "Old", date: "2099-01-02" }] }, "");
    const ev = c.events("2026-01-01");
    expect(ev[0]).toMatchObject({ id: 7, registration: "open" });
    expect(ev[1].registration).toBe("closed");
  });
});

describe("EventRegister", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("submits and shows the reference", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, reference: "REG-00012" }), { status: 200 }));
    const u = userEvent.setup();
    render(<EventRegister eventId={7} eventTitle="Camp" labels={labels} />);
    await u.click(screen.getByRole("button", { name: "Register" }));
    await u.type(screen.getByLabelText("Full name"), "Ann Lee");
    await u.type(screen.getByLabelText("Phone number"), "0551234567");
    await u.type(screen.getByLabelText("Email address"), "a@x.test");
    await u.selectOptions(screen.getByLabelText("Province"), "central");
    await u.type(screen.getByLabelText("Place"), "Riyadh");
    await u.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("REG-00012"));
    expect(JSON.parse((f.mock.calls[0][1] as RequestInit).body as string)).toMatchObject({ event_id: 7, region: "central" });
  });
  it("shows the duplicate message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "duplicate" }), { status: 409 }));
    const u = userEvent.setup();
    render(<EventRegister eventId={7} eventTitle="Camp" labels={labels} />);
    await u.click(screen.getByRole("button", { name: "Register" }));
    await u.type(screen.getByLabelText("Full name"), "Ann");
    await u.type(screen.getByLabelText("Phone number"), "0551234567");
    await u.type(screen.getByLabelText("Email address"), "a@x.test");
    await u.selectOptions(screen.getByLabelText("Province"), "central");
    await u.type(screen.getByLabelText("Place"), "Riyadh");
    await u.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Already registered");
  });
});

describe("route", () => {
  const req = (body: unknown, origin = "http://localhost:3000") =>
    new NextRequest("http://localhost:3000/api/event-registration", { method: "POST", headers: { origin, host: "localhost:3000", "content-type": "application/json" }, body: JSON.stringify(body) });
  beforeEach(() => { resetRateLimit(); vi.restoreAllMocks(); process.env.ODOO_BASE_URL = "http://odoo.test"; process.env.ODOO_API_TOKEN = "srv"; });
  it("forwards a valid registration, maps duplicate to 409, blocks cross-site", async () => {
    const { POST } = await import("@/app/api/event-registration/route");
    const good = { event_id: 7, name: "Ann Lee", phone: "0551234567", email: "a@x.test", region: "central", place: "Riyadh" };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, reference: "REG-00001" }), { status: 200 }));
    expect((await (await POST(req(good))).json()).reference).toBe("REG-00001");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "duplicate" }), { status: 409 }));
    const dup = await POST(req(good));
    expect([dup.status, (await dup.json()).error]).toEqual([409, "duplicate"]);
    expect((await POST(req(good, "https://evil.test"))).status).toBe(403);
    expect((await POST(req({ ...good, phone: "x" }))).status).toBe(422);
  });
});

describe("share link", () => {
  it("copies the registration URL", async () => {
    const { CopyLink } = await import("@/components/admin/copy-link");
    const w = vi.fn().mockResolvedValue(undefined);
    const u = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { value: { writeText: w }, configurable: true });
    render(<CopyLink path="/events/7" label="Copy" />);
    await u.click(screen.getByRole("button", { name: "Copy" }));
    expect(w).toHaveBeenCalledWith(window.location.origin + "/events/7");
  });
});
