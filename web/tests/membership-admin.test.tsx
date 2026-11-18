import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MembershipDashboard } from "@/components/admin/membership-dashboard";
import { MembersEditor } from "@/components/admin/members-editor";

const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });
const member = { id: 7, application_id: 3, number: "DISHA/2026/00007", name: "Asha Nair", category: "general", status: "active", region: "central", city: "Riyadh", mobile: "0551234567", email: "asha@x.test", approved: "2026-11-01", expiry: "2028-11-01" };

describe("membership dashboard", () => {
  afterEach(() => vi.restoreAllMocks());
  it("shows member and application counts", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({
      ok: true, applications: { new: 4, under_review: 1, contacted: 0, approved: 9, rejected: 2, total: 16 },
      members: { total: 9, by_status: { active: 7, suspended: 2 }, expiring_30: 3, expiring_60: 5, expired: 1 },
      regions: [{ key: "central", label: "Central Province", applications: 8, members: 5 }], categories: { general: { applications: 10, members: 6 }, associate: { applications: 6, members: 3 } },
      monthly: [{ month: "2026-11", applied: 4, approved: 2 }],
    }));
    render(<MembershipDashboard />);
    await waitFor(() => expect(screen.getByText("Total members")).toBeInTheDocument());
    expect(screen.getByText("Total members").nextElementSibling).toHaveTextContent("9");
    expect(screen.getByText("Expiring in 30 days").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("Central Province")).toBeInTheDocument();
  });
});

describe("members editor", () => {
  afterEach(() => vi.restoreAllMocks());
  it("lists members, searches server-side and resends the card", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ ok: true, total: 1, members: [member] }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MembersEditor />);
    await waitFor(() => expect(screen.getByText("Asha Nair")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Search members"), { target: { value: "asha" } });
    await waitFor(() => expect(f.mock.calls.some(([u]) => String(u).includes("q=asha"))).toBe(true));
    fireEvent.click(screen.getByText("Resend card"));
    await waitFor(() => {
      const post = f.mock.calls.find(([, o]) => (o as RequestInit | undefined)?.method === "POST");
      expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({ id: 7, op: "email_card" });
    });
  });
  it("edits contact details", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () => ok({ ok: true, total: 1, members: [member] }));
    render(<MembersEditor />);
    await waitFor(() => expect(screen.getByText("Asha Nair")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Edit contact"));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@x.test" } });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => {
      const post = f.mock.calls.find(([, o]) => (o as RequestInit | undefined)?.method === "POST");
      expect(JSON.parse(String((post![1] as RequestInit).body))).toMatchObject({ id: 7, op: "update_contact", email: "new@x.test", region: "central" });
    });
  });
  it("opens the detail panel with masked ID numbers", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u) => String(u).includes("app_id=")
      ? ok({ ok: true, application: { id: 3, name: "DISHA-MEM-00003", state: "approved", category: "General", photo: "", applied: "2026-11-01 10:00", approved: "2026-11-02 09:00", approved_by: "Admin", duplicates: 0, source: "Website",
          member: { id: 7, number: "DISHA/2026/00007", status: "active" }, membership: { expiry_date: "2028-11-01" },
          sections: [{ title: "Personal", rows: [["Full name", "Asha Nair"]] }, { title: "Contact & KSA", rows: [["Passport no.", "\u2022\u2022\u2022\u2022\u2022678"]] }] } })
      : ok({ ok: true, total: 1, members: [member] }));
    render(<MembersEditor />);
    await waitFor(() => expect(screen.getByText("Asha Nair")).toBeInTheDocument());
    fireEvent.click(screen.getByText("View"));
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Member details" })).toBeInTheDocument());
    expect(screen.getByText("Passport no.")).toBeInTheDocument();
    expect(screen.getByText(/678/)).toBeInTheDocument();
    expect(screen.getAllByText("DISHA/2026/00007").length).toBeGreaterThan(1);
  });
  it("renews and suspends from the detail panel", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async (u) => String(u).includes("app_id=")
      ? ok({ ok: true, application: { id: 3, name: "A3", state: "approved", category: "General", photo: "", applied: "", approved: "", approved_by: "", duplicates: 0, source: "Website",
          member: { id: 7, number: "DISHA/2026/00007", status: "active" }, membership: null, terms: [{ kind: "new", start: "2026-11-01", end: "2028-10-31", note: "", by: "Admin" }], sections: [{ title: "Personal", rows: [["Full name", "Asha Nair"]] }] } })
      : ok({ ok: true, total: 1, members: [member] }));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MembersEditor />);
    await waitFor(() => expect(screen.getByText("Asha Nair")).toBeInTheDocument());
    fireEvent.click(screen.getByText("View"));
    await waitFor(() => expect(screen.getByText("Subscription history")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Renew for"), { target: { value: "2" } });
    fireEvent.click(screen.getByText("Renew"));
    fireEvent.click(screen.getByText("Suspend"));
    await waitFor(() => {
      const bodies = f.mock.calls.filter(([, o]) => (o as RequestInit | undefined)?.method === "POST").map(([, o]) => JSON.parse(String((o as RequestInit).body)));
      expect(bodies).toContainEqual({ id: 7, op: "renew", years: 2 });
      expect(bodies).toContainEqual({ id: 7, op: "suspend" });
    });
  });
});
