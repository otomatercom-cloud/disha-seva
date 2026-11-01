import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipForm } from "@/components/forms/membership-form";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  window.scrollTo = vi.fn();
});

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  const type = (label: RegExp, value: string) => user.type(screen.getByLabelText(label), value);
  await type(/full name/i, "Asha Nair");
  await user.selectOptions(screen.getByLabelText(/gender/i), "female");
  await type(/date of birth/i, "1992-04-12");
  await type(/mobile number/i, "+966501234567");
  await type(/email address/i, "asha@example.com");
  await user.selectOptions(screen.getByLabelText(/province \/ region/i), "central");
  await type(/city \/ area/i, "Riyadh");
  await type(/passport number/i, "P1234567");
  await type(/^state/i, "Kerala");
  await type(/district/i, "Thrissur");
  await type(/village \/ town/i, "Irinjalakuda");
  await type(/pin code/i, "680121");
  await type(/full address in india/i, "Nair House");
  await type(/contact in ksa: name/i, "Ravi");
  await type(/contact in ksa: relationship/i, "Brother");
  await type(/contact in ksa: mobile/i, "+966500000001");
  await type(/contact in india: name/i, "Lakshmi");
  await type(/contact in india: relationship/i, "Mother");
  await type(/contact in india: mobile/i, "+919847000001");
  await user.click(screen.getByRole("checkbox", { name: /i agree/i }));
}
const submit = () => screen.getByRole("button", { name: /submit application|submitting/i });

describe("MembershipForm", () => {
  it("shows required-field errors and does not call the API", async () => {
    const user = userEvent.setup();
    render(<MembershipForm />);
    await user.click(submit());
    expect(await screen.findAllByText(/this field is required/i)).not.toHaveLength(0);
    expect(screen.getByText(/must accept the declaration/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates email and phone formats inline", async () => {
    const user = userEvent.setup();
    render(<MembershipForm />);
    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.type(screen.getByLabelText(/mobile number/i), "abc");
    await user.click(submit());
    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/valid phone number/i)).toBeInTheDocument();
  });

  it("shows loading, blocks double submit, then shows the reference from the backend", async () => {
    const user = userEvent.setup();
    let release!: (r: Response) => void;
    fetchMock.mockReturnValue(new Promise<Response>((r) => (release = r)));
    render(<MembershipForm />);
    await fillRequired(user);
    await user.dblClick(submit());
    await waitFor(() => expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("reference")).not.toBeInTheDocument(); // no success before backend confirms
    release(new Response(JSON.stringify({ ok: true, reference: "DISHA-MEM-00042" }), { status: 200 }));
    expect(await screen.findByTestId("reference")).toHaveTextContent("DISHA-MEM-00042");
    expect(screen.getByText(/application has been received successfully/i)).toBeInTheDocument();
  });

  it("sends an Idempotency-Key header", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, reference: "DISHA-MEM-1" }), { status: 200 }));
    render(<MembershipForm />);
    await fillRequired(user);
    await user.click(submit());
    await screen.findByTestId("reference");
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^[A-Za-z0-9-]{16,64}$/);
  });

  it("keeps entered values and reuses the same key when a retry follows a server error", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: "unavailable", message: "Our membership system is temporarily unavailable. Your details were not saved." }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, reference: "DISHA-MEM-2" }), { status: 200 }));
    render(<MembershipForm />);
    await fillRequired(user);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(/not saved/i);
    expect(screen.getByLabelText(/full name/i)).toHaveValue("Asha Nair");
    await user.click(submit());
    await screen.findByTestId("reference");
    const keys = fetchMock.mock.calls.map((c) => c[1].headers["Idempotency-Key"]);
    expect(keys[0]).toBe(keys[1]);
  });

  it("shows a network failure without claiming success", async () => {
    const user = userEvent.setup();
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    render(<MembershipForm />);
    await fillRequired(user);
    await user.click(submit());
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not reach the server/i);
    expect(screen.queryByTestId("reference")).not.toBeInTheDocument();
  });

  it("maps server field errors onto the fields", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: false, error: "validation_error", message: "Please correct the highlighted fields.", fields: { mobile: "Enter a valid phone number." } }), { status: 422 }));
    render(<MembershipForm />);
    await fillRequired(user);
    await user.click(submit());
    expect(await screen.findByText("Enter a valid phone number.")).toBeInTheDocument();
  });
});
