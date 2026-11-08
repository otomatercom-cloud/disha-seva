import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { YearGallery } from "@/components/sections/year-gallery";
import { VisionMission } from "@/components/sections/vision-mission";

const photos = [
  { src: "/a.jpg", alt: "Yoga one", year: 2023, category: "Yoga" },
  { src: "/b.jpg", alt: "Dance two", year: 2022, category: "Cultural" },
  { src: "/c.jpg", alt: "Yoga three", year: 2022, category: "Yoga" },
];

describe("YearGallery", () => {
  it("groups by year (newest first) and filters by year and category", async () => {
    const u = userEvent.setup();
    render(<YearGallery photos={photos} />);
    const heads = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(heads).toEqual(["2023 moments", "2022 moments"]);
    await u.click(screen.getByRole("button", { name: /^2022/ }));
    expect(screen.queryByRole("button", { name: "Open photo: Yoga one" })).toBeNull();
    await u.click(screen.getByRole("button", { name: "Cultural" }));
    expect(screen.getAllByRole("button", { name: /Open photo/ })).toHaveLength(1);
    await u.click(screen.getByRole("button", { name: "Yoga" }));
    await u.click(screen.getByRole("button", { name: "All years" }));
    expect(screen.getAllByRole("button", { name: /Open photo/ })).toHaveLength(2);
  });
  it("shows an empty message when nothing matches", async () => {
    const u = userEvent.setup();
    render(<YearGallery photos={photos} />);
    await u.click(screen.getByRole("button", { name: /^2023/ }));
    await u.click(screen.getByRole("button", { name: "Cultural" }));
    expect(screen.getByText("No photos in this selection.")).toBeInTheDocument();
  });
});

describe("VisionMission", () => {
  it("renders both slides and lets the visitor switch", async () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
    render(<VisionMission items={[{ label: "Our vision", text: "V text" }, { label: "Our mission", text: "M text" }]} />);
    expect(screen.getByText("V text")).toBeInTheDocument();
    expect(screen.getByText("M text")).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Show Our mission" }));
    expect(screen.getByRole("button", { name: "Show Our mission" })).toHaveAttribute("aria-current", "true");
  });
});
