import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApplicationsEditor } from "@/components/admin/applications-editor";

const app = (state: string, id: number) => ({ id, name: `A${id}`, full_name: `Person ${id}`, category: "general", state, region: "central", city: "Riyadh",
  email: "a@x.test", mobile: "0551234567", applied: "2026-11-01 10:00:00", duplicates: 0, member_number: "" });

describe("applications workflow buttons", () => {
  afterEach(() => vi.restoreAllMocks());
  it("only offers the steps the status allows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, applications: [app("new", 1), app("under_review", 2), app("contacted", 3), app("rejected", 4), app("approved", 5)] }), { status: 200 }));
    render(<ApplicationsEditor />);
    await waitFor(() => expect(screen.getByText("Person 1")).toBeInTheDocument());
    const row = (n: number) => screen.getByText(`Person ${n}`).closest("tr") as HTMLElement;
    const labels = (n: number) => Array.from(row(n).querySelectorAll("button")).map((b) => b.textContent);
    expect(labels(1)).toEqual(["Start review", "Mark contacted", "Reject"]);              // no Approve straight from New
    expect(labels(2)).toEqual(["Mark contacted", "Approve", "Reject", "Reset to new"]);
    expect(labels(3)).toEqual(["Approve", "Reject", "Reset to new"]);
    expect(labels(4)).toEqual(["Reset to new"]);                                          // rejected must be reset first
    expect(labels(5)).toEqual([]);                                                         // approved is final
  });
});
