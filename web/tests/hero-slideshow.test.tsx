import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeroSlideshow } from "@/components/sections/hero-slideshow";

const slides = [
  { src: "/gallery/a.jpg", alt: "First photo" },
  { src: "/gallery/b.jpg", alt: "Second photo" },
  { src: "/gallery/c.jpg", alt: "Third photo" },
];
const shown = () => screen.getAllByRole("group", { hidden: true }).findIndex((g) => g.getAttribute("aria-hidden") === "false");

function mockMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: reduce, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("HeroSlideshow", () => {
  it("auto-advances and loops", () => {
    mockMotion(false);
    render(<HeroSlideshow slides={slides} />);
    expect(shown()).toBe(0);
    act(() => { vi.advanceTimersByTime(5100); });
    expect(shown()).toBe(1);
    act(() => { vi.advanceTimersByTime(10200); });
    expect(shown()).toBe(0);
  });

  it("supports next/previous/dots and pause", async () => {
    mockMotion(false);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroSlideshow slides={slides} />);
    await user.click(screen.getByRole("button", { name: /next photo/i }));
    expect(shown()).toBe(1);
    await user.click(screen.getByRole("button", { name: /previous photo/i }));
    await user.click(screen.getByRole("button", { name: /previous photo/i }));
    expect(shown()).toBe(2);
    await user.click(screen.getByRole("button", { name: /show photo 1/i }));
    expect(shown()).toBe(0);
    // the pointer is over the carousel, so it is paused (hover pause): no advance, button offers "Play"
    act(() => { vi.advanceTimersByTime(12000); });
    expect(shown()).toBe(0);
    expect(screen.getByRole("button", { name: /play slideshow/i })).toBeInTheDocument();
  });

  it("does not autoplay for reduced-motion users", () => {
    mockMotion(true);
    render(<HeroSlideshow slides={slides} />);
    act(() => { vi.advanceTimersByTime(12000); });
    expect(shown()).toBe(0);
    expect(screen.queryByRole("button", { name: /pause slideshow/i })).not.toBeInTheDocument();
  });

  it("hides controls for a single photo", () => {
    mockMotion(false);
    render(<HeroSlideshow slides={slides.slice(0, 1)} />);
    expect(screen.queryByRole("button", { name: /next photo/i })).not.toBeInTheDocument();
  });
});
