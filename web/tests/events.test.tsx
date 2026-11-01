import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { dateLabel } from "@/components/sections/events";
import { buildContent } from "@/lib/content";

const ev = (title: string, date: string, extra = {}) => ({ title, date, ...extra });

describe("events", () => {
  it("is empty when Odoo is unreachable or sends nothing", () => {
    expect(buildContent(null).events("2026-10-26")).toEqual([]);
    expect(buildContent({ events: [] }).events("2026-10-26")).toEqual([]);
  });

  it("orders upcoming soonest-first, then past latest-first, and drops bad rows", () => {
    const c = buildContent({
      events: [
        ev("Old A", "2026-01-10"), ev("Later", "2026-12-01"), ev("Old B", "2026-09-01"),
        ev("Soon", "2026-11-02"), ev("Running", "2026-10-20", { end_date: "2026-10-30" }),
        { title: "", date: "2026-11-05" }, { title: "No date" }, ev("Bad date", "05/11/2026"),
      ],
    }, "https://odoo.test");
    expect(c.events("2026-10-26").map((e) => e.title)).toEqual(["Running", "Soon", "Later", "Old B", "Old A"]);
  });

  it("makes the photo URL absolute", () => {
    const [e] = buildContent({ events: [ev("X", "2026-11-02", { image: "/iof/site-media/event/3/image?v=1" })] }, "https://odoo.test").events("2026-10-26");
    expect(e.image).toBe("https://odoo.test/iof/site-media/event/3/image?v=1");
  });

  it("carries the province, defaulting to all", () => {
    const [a, b] = buildContent({ events: [ev("A", "2026-11-02", { region: "eastern", region_label: "Eastern Province" }), ev("B", "2026-11-03")] }).events("2026-10-26");
    expect([a.region, a.regionLabel, b.region, b.regionLabel]).toEqual(["eastern", "Eastern Province", "all", ""]);
  });

  it("formats single and multi-day dates", () => {
    expect(dateLabel({ date: "2026-11-02", endDate: "" })).toBe("2 Nov 2026");
    expect(dateLabel({ date: "2026-11-02", endDate: "2026-11-04" })).toBe("2 Nov – 4 Nov 2026");
  });
});
