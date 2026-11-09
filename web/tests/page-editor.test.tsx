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

describe("markEditable: paragraphs and cards", () => {
  it("matches long-article paragraphs, bullet lines and card items", () => {
    document.body.innerHTML = `<h2>Information we collect</h2><p>We collect your name and <a href="/x">contact details</a>.</p><ul><li>Name</li><li>Phone</li></ul>
      <div><b>232</b><span>Working centres in KSA</span></div><p>Not editable</p>`;
    const long = t(7, "terms.body", "Legal", "## Information we collect\n\nWe collect your name and [contact details](/x).\n\n- Name\n- Phone", "long");
    const n = markEditable(document, [long], [{ id: 9, title: "232", text: "Working centres in KSA", image: "" }]);
    expect(n).toBe(6);
    expect(document.querySelector("h2")?.getAttribute("data-ed")).toBe("terms.body");
    expect(document.querySelector("p")?.getAttribute("data-ed")).toBe("terms.body");   // link inside the paragraph still matches
    expect(document.querySelector("b")?.getAttribute("data-edi")).toBe("9");
    expect(document.querySelector("span")?.getAttribute("data-edi")).toBe("9");
    expect(document.querySelectorAll("p")[1].hasAttribute("data-ed")).toBe(false);
  });
});

describe("PageEditor", () => {
  afterEach(() => vi.restoreAllMocks());
  it("lists the sections of a page and shows only that section's fields", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (u) => new Response(JSON.stringify(String(u).includes("/items")
      ? { ok: true, items: [{ id: 5, collection: "stats", title: "232", text: "Working centres", icon: "", year: 0, category: "", sequence: 1, published: true, image: "", file: "", file_name: "" }], collections: [["stats", "About: key figures"]], icons: [] }
      : { ok: true, texts: TEXTS }), { status: 200 }));
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
    expect(await screen.findByText("Cards & lists on this page")).toBeInTheDocument();
    await u.click(await screen.findByRole("button", { name: "232" }));
    expect(screen.getByText(/Editing card: About: key figures/)).toBeInTheDocument();
    await u.click(screen.getByRole("button", { name: "+ Add another card" }));
    const call = vi.mocked(fetch).mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === "POST");
    expect(JSON.parse((call![1] as RequestInit).body as string)).toMatchObject({ op: "create", vals: { collection: "stats", title: "New card", sequence: 11 } });
  });
});
