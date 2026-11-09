import "server-only";
import { cache } from "react";
import { COLLECTIONS, TEXTS } from "@/content/defaults";
import { GALLERY } from "@/lib/gallery";
import { images } from "@/lib/utils";

export type Item = { title: string; text: string; icon: string; url: string; image: string; file: string; year: number; category: string };
export type SiteEvent = {
  title: string; date: string; endDate: string; time: string; location: string; details: string; image: string;
  region: string; regionLabel: string;
  /** Odoo event id (needed to register) and whether the Register button should show. */
  id: number; registration: "open" | "full" | "closed";
};
type ApiEvent = {
  title?: string; date?: string; end_date?: string; time?: string; location?: string; details?: string;
  image?: string; region?: string; region_label?: string; id?: number; registration?: string;
};
type ApiPayload = {
  events?: ApiEvent[];
  texts?: Record<string, string>;
  images?: Record<string, string>;
  collections?: Record<string, Partial<Item>[]>;
};

export type Content = {
  /** Editable text; falls back to the built-in default. */
  t: (key: string) => string;
  /** Section switch ("... .show.x" texts): false only when staff typed "no". */
  show: (key: string) => boolean;
  /** Editable image URL; falls back to the legacy hot-linked image, or null. */
  img: (key: string) => string | null;
  items: (name: string) => Item[];
  /** Events from Odoo: upcoming first (soonest first), then past (latest first). Empty if none / Odoo down. */
  events: (today?: string) => SiteEvent[];
};

const FALLBACK_IMAGES: Record<string, string> = { "site.logo": images.logo, "home.intro.image": images.about };
/** Text pasted from web pages sometimes carries HTML entities (&amp;); React would print them literally. */
const decode = (s: string) => s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (m) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " })[m] ?? m);

const blank: Item = { title: "", text: "", icon: "", url: "", image: "", file: "", year: 0, category: "" };

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
    t: (key) => decode(data?.texts?.[key]?.trim() || TEXTS[key]?.[2] || ""),
    show: (key) => (data?.texts?.[key]?.trim() || TEXTS[key]?.[2] || "yes").toLowerCase() !== "no",
    img: (key) => abs(data?.images?.[key]) || FALLBACK_IMAGES[key] || null,
    events: (today = new Date().toISOString().slice(0, 10)) => {
      const list = (data?.events ?? [])
        .filter((e) => e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date ?? ""))
        .map((e) => ({
          title: e.title!, date: e.date!, endDate: e.end_date || "", time: e.time || "",
          location: e.location || "", details: e.details || "", image: abs(e.image),
          region: e.region || "all", regionLabel: e.region_label || "",
          id: Number(e.id) || 0,
          registration: (e.registration === "open" || e.registration === "full" ? e.registration : "closed") as SiteEvent["registration"],
        }));
      const last = (e: SiteEvent) => e.endDate || e.date;
      const up = list.filter((e) => last(e) >= today).sort((a, b) => a.date.localeCompare(b.date));
      const past = list.filter((e) => last(e) < today).sort((a, b) => b.date.localeCompare(a.date));
      return [...up, ...past];
    },
    items: (name) => {
      const live = data?.collections?.[name];
      if (live && live.length) {
        return live.map((i) => ({ ...blank, ...i, title: decode(i.title ?? ""), text: decode(i.text ?? ""), image: abs(i.image), file: abs(i.file) }));
      }
      if (name === "gallery") return GALLERY.map((g) => ({ ...blank, title: g.alt, image: g.src, year: g.year ?? 0, category: g.category ?? "" }));
      // Odoo reachable but list intentionally emptied: honour it; unreachable: defaults
      if (live) return [];
      return (COLLECTIONS[name]?.items ?? []).map((i) => ({ ...blank, ...i }));
    },
  };
}

/** One fetch per request; Next caches the Odoo response for CONTENT_REVALIDATE_S seconds. */
export const getContent = cache(async () => buildContent(await load()));
