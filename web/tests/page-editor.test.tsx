import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PageEditor, markEditable } from "@/components/admin/page-editor";

const t = (id: number, key: string, page: string, value: string, kind: "line" | "text" | "long" | "image" = "line", image = "") => ({ id, key, page, label: key, kind, value, default: value, changed: false, image });
const TEXTS = [
  t(1, "home.hero.badge", "Home", "DISHA · Kingdom of Saudi Arabia"),
  t(2, "home.hero.title_main", "Home", "Aligning India and Saudi Arabia,"),
  t(3, "home.intro.heading", "Home", "Who we are"),
  t(4, "about.vision.title", "About", "Our Vision"),
  t(5, "site.name", "Site-wide", "DISHA"),
];

describe("markEditable", () => {
  it("marks text and images that match editable content", () => {
    document.body.innerHTML = `<h1>Aligning India   and Saudi Arabia,</h1><p>Unrelated</p><span>Who we are</span><img src="/_next/image?url=%2Fdisha%2Fsite-media%2Fp%2F1%2Fimage&w=640">`;
    const n = markEditable(document, [...TEXTS, t(6, "home.hero.photo", "Home", "", "image", "/disha/site-media/p/1/image?v=3")]);
    expect(n).toBe(3);
    expect(document.querySelector("h1")?.getAttribute("data-ed")).toBe("home.hero.title_main");
    expect(document.querySelector("img")?.getAttribute("data-ed")).toBe("home.hero.photo");
    expect(document.querySelector("p")?.hasAttribute("data-ed")).toBe(false);
  });
});

describe("PageEditor", () => {
  afterEach(() => vi.restoreAllMocks());
  it("lists the sections of a page and shows only that section's fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, texts: TEXTS }), { status: 200 }));
    const u = userEvent.setup();
    render(<PageEditor />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Hero (top banner)" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Intro" })).toBeInTheDocument();
    expect(screen.getByLabelText("home.hero.badge")).toBeInTheDocument();
    expect(screen.queryByLabelText("home.intro.heading")).toBeNull();
    await u.click(screen.getByRole("button", { name: "Intro" }));
    expect(screen.getByLabelText("home.intro.heading")).toBeInTheDocument();
    expect(screen.getByTitle("Live preview")).toHaveAttribute("src", "/");
    await u.selectOptions(screen.getByLabelText("Page"), "About");
    expect(screen.getByTitle("Live preview")).toHaveAttribute("src", "/about");
  });
});
