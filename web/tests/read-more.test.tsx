import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReadMore } from "@/components/ui/read-more";
import { buildContent } from "@/lib/content";

const size = (scroll: number, client: number) => {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scroll);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(client);
};
describe("ReadMore", () => {
  afterEach(() => vi.restoreAllMocks());
  it("shows the button only for long text and toggles", async () => {
    size(400, 120);
    const u = userEvent.setup();
    render(<ReadMore>Long text</ReadMore>);
    const b = screen.getByRole("button", { name: "Read more" });
    expect(b).toHaveAttribute("aria-expanded", "false");
    await u.click(b);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
    await u.click(screen.getByRole("button", { name: "Show less" }));
    expect(screen.getByRole("button", { name: "Read more" })).toBeInTheDocument();
  });
  it("has no button when the text fits", () => {
    size(100, 100);
    render(<ReadMore>Short</ReadMore>);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
describe("entities", () => {
  it("decodes &amp; in texts and cards", () => {
    const c = buildContent({ texts: { "site.name": "A &amp; B" }, collections: { activities: [{ title: "Tea &amp; Talk", text: "Painting &amp; Coloring" }] } }, "");
    expect(c.t("site.name")).toBe("A & B");
    expect(c.items("activities")[0]).toMatchObject({ title: "Tea & Talk", text: "Painting & Coloring" });
  });
});
