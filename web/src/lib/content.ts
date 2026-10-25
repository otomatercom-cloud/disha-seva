import "server-only";
import { cache } from "react";
import { COLLECTIONS, TEXTS } from "@/content/defaults";
import { GALLERY } from "@/lib/gallery";
import { images } from "@/lib/utils";

export type Item = { title: string; text: string; icon: string; url: string; image: string; file: string };
type ApiPayload = {
  texts?: Record<string, string>;
  images?: Record<string, string>;
  collections?: Record<string, Partial<Item>[]>;
};

export type Content = {
  /** Editable text; falls back to the built-in default. */
  t: (key: string) => string;
  /** Editable image URL; falls back to the legacy hot-linked image, or null. */
  img: (key: string) => string | null;
  items: (name: string) => Item[];
};

const FALLBACK_IMAGES: Record<string, string> = { "site.logo": images.logo, "home.intro.image": images.about };
const blank: Item = { title: "", text: "", icon: "", url: "", image: "", file: "" };

/** Public base for media URLs (what the visitor's browser/Next image optimiser can reach). */
export function mediaBase() {
  return (process.env.ODOO_PUBLIC_URL || process.env.ODOO_BASE_URL || "").replace(/\/+$/, "");
}

async function load(): Promise<ApiPayload | null> {
  const base = process.env.ODOO_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  const url = new URL(base + "/api/disha/site-content");
  if (process.env.ODOO_DATABASE) url.searchParams.set("db", process.env.ODOO_DATABASE);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.CONTENT_TIMEOUT_MS) || 3000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: Number(process.env.CONTENT_REVALIDATE_S) || 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as ApiPayload;
  } catch {
    return null; // Odoo unreachable: render the built-in defaults, never fail the page
  } finally {
    clearTimeout(timer);
  }
}

export function buildContent(data: ApiPayload | null, media = mediaBase()): Content {
  const abs = (u?: string) => (u ? (/^https?:\/\//.test(u) ? u : media + u) : "");
  return {
    t: (key) => data?.texts?.[key]?.trim() || TEXTS[key]?.[2] || "",
    img: (key) => abs(data?.images?.[key]) || FALLBACK_IMAGES[key] || null,
    items: (name) => {
      const live = data?.collections?.[name];
      if (live && live.length) {
        return live.map((i) => ({ ...blank, ...i, image: abs(i.image), file: abs(i.file) }));
      }
      if (name === "gallery") return GALLERY.map((g) => ({ ...blank, title: g.alt, image: g.src }));
      // Odoo reachable but list intentionally emptied: honour it; unreachable: defaults
      if (live) return [];
      return (COLLECTIONS[name]?.items ?? []).map((i) => ({ ...blank, ...i }));
    },
  };
}

/** One fetch per request; Next caches the Odoo response for CONTENT_REVALIDATE_S seconds. */
export const getContent = cache(async () => buildContent(await load()));
