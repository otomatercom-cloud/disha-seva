import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { PhotoGallery } from "@/components/sections/photo-gallery";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const photos = [
  { src: "/a.jpg", alt: "First photo" },
  { src: "/b.jpg", alt: "Second photo" },
  { src: "/c.jpg", alt: "Third photo" },
];

beforeAll(() => {
  // jsdom has no <dialog> modal support
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
});

describe("PhotoGallery", () => {
  it("renders every photo as an accessible button", () => {
    render(<PhotoGallery photos={photos} />);
    expect(screen.getAllByRole("button", { name: /open photo/i })).toHaveLength(3);
  });

  it("honours the limit", () => {
    render(<PhotoGallery photos={photos} limit={2} />);
    expect(screen.getAllByRole("button", { name: /open photo/i })).toHaveLength(2);
  });

  it("opens the viewer, navigates with buttons and arrow keys (wrapping), and closes", async () => {
    const user = userEvent.setup();
    render(<PhotoGallery photos={photos} />);
    await user.click(screen.getByRole("button", { name: /open photo: second photo/i }));
    const viewer = document.querySelector("dialog")!;
    expect(viewer).toHaveAttribute("open");
    expect(viewer).toHaveTextContent("2 / 3");

    await user.click(screen.getByRole("button", { name: /next photo/i }));
    expect(viewer).toHaveTextContent("3 / 3");
    await user.click(screen.getByRole("button", { name: /next photo/i }));
    expect(viewer).toHaveTextContent("1 / 3"); // wraps
    await user.keyboard("{ArrowLeft}");
    expect(viewer).toHaveTextContent("3 / 3");

    await user.click(screen.getByRole("button", { name: /close photo viewer/i }));
    expect(viewer).not.toHaveAttribute("open");
  });
});
