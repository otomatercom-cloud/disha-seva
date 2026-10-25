import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText } from "@/components/ui/rich-text";
import { COLLECTIONS, TEXTS } from "@/content/defaults";
import { buildContent } from "@/lib/content";

describe("buildContent", () => {
  it("uses defaults when Odoo is unreachable", () => {
    const c = buildContent(null, "https://odoo.test");
    expect(c.t("site.email")).toBe("dishaindians@gmail.com");
    expect(c.items("pillars")).toHaveLength(4);
    expect(c.items("gallery").length).toBeGreaterThan(0);
    expect(c.img("site.logo")).toBe("/disha-logo.png");
  });

  it("prefers Odoo values and makes media URLs absolute", () => {
    const c = buildContent({
      texts: { "site.email": "x@y.org", "home.hero.title_main": "   " },
      images: { "site.logo": "/disha/site-media/text/1/image?v=1" },
      collections: { pillars: [{ title: "Only one", icon: "droplet", image: "/disha/site-media/item/2/image" }], faq: [] },
    }, "https://odoo.test");
    expect(c.t("site.email")).toBe("x@y.org");
    expect(c.t("home.hero.title_main")).toBe(TEXTS["home.hero.title_main"][2]); // blank = default
    expect(c.img("site.logo")).toBe("https://odoo.test/disha/site-media/text/1/image?v=1");
    expect(c.items("pillars")).toHaveLength(1);
    expect(c.items("pillars")[0].image).toBe("https://odoo.test/disha/site-media/item/2/image");
    expect(c.items("faq")).toEqual([]); // emptied on purpose
  });

  it("falls back to legacy photos only when the live gallery is empty", () => {
    expect(buildContent({ collections: { gallery: [] } }, "").items("gallery").length).toBeGreaterThan(0);
    const live = buildContent({ collections: { gallery: [{ title: "A", image: "/m/1" }] } }, "https://o");
    expect(live.items("gallery")).toHaveLength(1);
  });

  it("every collection and text key has a definition", () => {
    expect(Object.keys(COLLECTIONS)).toContain("gallery");
    for (const [k, v] of Object.entries(TEXTS)) expect(v[1], k).toBeTruthy();
  });
});

describe("RichText", () => {
  it("renders headings, bullets, paragraphs and the email link without injecting HTML", () => {
    const { container } = render(<RichText source={"## Title\nHello {email}\n\n- one\n- two\n\n<script>alert(1)</script>"} email="a@b.org" />);
    expect(container.querySelector("h2")?.textContent).toBe("Title");
    expect(container.querySelectorAll("li")).toHaveLength(2);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("mailto:a@b.org");
    expect(container.querySelector("script")).toBeNull();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });
});
