import { describe, expect, it } from "vitest";
import { buildContent } from "@/lib/content";
import { TEXTS } from "@/content/defaults";

describe("section switches", () => {
  it("shows by default, hides only on 'no', and the About article ships as default text", () => {
    const c = buildContent(null, "");
    expect(c.show("about.show.team")).toBe(true);
    expect(c.show("home.show.hero")).toBe(true);
    expect(c.show("about.show.formation")).toBe(false);       // replaced by the article
    expect(c.t("about.article")).toContain("DISHA (Dedicated team for Indo Saudi Holistic Alignment)");
    const hidden = buildContent({ texts: { "about.show.team": " No " } }, "");
    expect(hidden.show("about.show.team")).toBe(false);
    const shown = buildContent({ texts: { "about.show.formation": "yes" } }, "");
    expect(shown.show("about.show.formation")).toBe(true);
  });
  it("every switch has a yes/no default and a label", () => {
    const sw = Object.entries(TEXTS).filter(([k]) => k.includes(".show."));
    expect(sw.length).toBeGreaterThanOrEqual(17);
    for (const [, [, label, v]] of sw) { expect(label).toMatch(/yes \/ no/); expect(["yes", "no"]).toContain(v); }
  });
});
