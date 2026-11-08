"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GalleryPhoto } from "@/lib/gallery";
import { cn } from "@/lib/utils";

const SHAPES = ["aspect-[16/10]", "aspect-[3/4]", "aspect-square", "aspect-[16/10]", "aspect-square", "aspect-[3/4]"];

const pill =
  "relative overflow-hidden rounded-full border-[1.5px] px-5 py-2 text-sm font-medium transition focus-visible:outline-offset-2 ";
const pillCls = (on: boolean) =>
  pill + (on ? "border-saffron-600 bg-saffron-600 text-white" : "border-slate-300 text-slate-700 hover:border-saffron-500");

/** Year-wise photo gallery with year + category filters and a keyboard-friendly viewer. */
export function YearGallery({ photos, labels }: {
  photos: GalleryPhoto[];
  labels?: { year: string; category: string; all: string; allYears: string; empty: string };
}) {
  const L = labels ?? { year: "Year", category: "Category", all: "All", allYears: "All years", empty: "No photos in this selection." };
  const [year, setYear] = useState<string>("all");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const years = useMemo(
    () => [...new Set(photos.map((p) => p.year || 0))].sort((a, b) => b - a),
    [photos],
  );
  const cats = useMemo(
    () => [...new Set(photos.map((p) => p.category?.trim()).filter(Boolean) as string[])].sort(),
    [photos],
  );
  const shown = useMemo(
    () => photos.filter((p) => (year === "all" || String(p.year || 0) === year) && (cat === "all" || p.category === cat)),
    [photos, year, cat],
  );
  const groups = years
    .map((y) => ({ y, items: shown.filter((p) => (p.year || 0) === y) }))
    .filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);

  const close = useCallback(() => { dialogRef.current?.close(); setOpen(null); lastTrigger.current?.focus(); }, []);
  const step = useCallback((d: 1 | -1) => setOpen((i) => (i === null ? i : (i + d + flat.length) % flat.length)), [flat.length]);

  useEffect(() => {
    if (open !== null && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [open]);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  const current = open === null ? null : flat[open];
  const yearLabel = (y: number) => (y ? String(y) : "—");
  const count = (y: number) => photos.filter((p) => (p.year || 0) === y).length;
  let idx = -1;

  return (
    <div>
      <div className="top-20 z-30 mb-14 grid gap-3.5 rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_rgba(15,61,46,.12)] sm:p-5 md:sticky">
        <div role="group" aria-label={L.year} className="flex flex-wrap items-center gap-2.5">
          <b className="font-display min-w-full text-[13px] uppercase tracking-[2px] text-slate-500 sm:min-w-[84px]">{L.year}</b>
          <button type="button" aria-pressed={year === "all"} className={pillCls(year === "all")} onClick={() => setYear("all")}>{L.allYears}</button>
          {years.map((y) => (
            <button key={y} type="button" aria-pressed={year === String(y)} className={pillCls(year === String(y))} onClick={() => setYear(String(y))}>
              {yearLabel(y)}<small className="ml-1.5 opacity-70">{count(y)}</small>
            </button>
          ))}
        </div>
        {cats.length > 0 && (
          <div role="group" aria-label={L.category} className="flex flex-wrap items-center gap-2.5">
            <b className="font-display min-w-full text-[13px] uppercase tracking-[2px] text-slate-500 sm:min-w-[84px]">{L.category}</b>
            <button type="button" aria-pressed={cat === "all"} className={pillCls(cat === "all")} onClick={() => setCat("all")}>{L.all}</button>
            {cats.map((c) => (
              <button key={c} type="button" aria-pressed={cat === c} className={pillCls(cat === c)} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      <div aria-live="polite">
        {groups.length === 0 && <p className="py-20 text-center text-lg text-slate-500">{L.empty}</p>}
      </div>

      {groups.map(({ y, items }) => (
        <section key={y} aria-label={yearLabel(y)} className="mb-20">
          <div className="reveal mb-8 flex items-end gap-6 overflow-hidden">
            <span aria-hidden className="font-display text-[clamp(72px,14vw,160px)] font-bold leading-[.8] text-transparent [-webkit-text-stroke:2px_var(--color-saffron-500)]">{yearLabel(y)}</span>
            <div className="pb-2.5">
              <h2 className="text-xl sm:text-2xl">{y ? `${y}` : ""} moments</h2>
              <span className="text-sm text-slate-500">{items.length} photo{items.length > 1 ? "s" : ""}</span>
            </div>
            <div aria-hidden className="mb-2 hidden h-px flex-1 bg-gradient-to-r from-saffron-500 to-transparent sm:block" />
          </div>
          <ul className="columns-1 gap-5 sm:columns-2 lg:columns-3">
            {items.map((p, n) => {
              const i = ++idx;
              return (
                <li key={p.src} className="reveal mb-5 break-inside-avoid">
                  <button
                    type="button"
                    aria-label={`Open photo: ${p.alt}`}
                    onClick={(e) => { lastTrigger.current = e.currentTarget; setOpen(i); }}
                    className="group relative block w-full overflow-hidden rounded-[18px] bg-navy-900"
                  >
                    <span className={cn("relative block w-full", SHAPES[n % SHAPES.length])}>
                      <Image src={p.src} alt={p.alt} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
                        className="object-cover transition duration-1000 group-hover:scale-110 group-hover:saturate-125" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050f0c]/90 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
                    <span className="absolute right-4 top-4 flex size-10 scale-0 items-center justify-center rounded-full bg-saffron-600 text-white transition group-hover:scale-100 group-focus-visible:scale-100"><ZoomIn className="size-4" aria-hidden /></span>
                    <span className="absolute inset-x-0 bottom-0 translate-y-6 p-5 text-left text-white opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                      {p.category && <em className="mb-2 inline-block rounded-full bg-saffron-600 px-3 py-0.5 text-[11px] not-italic uppercase tracking-[1.5px]">{p.category}</em>}
                      <span className="block text-sm leading-snug">{p.alt}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <dialog ref={dialogRef} aria-label="Photo viewer" onClose={() => setOpen(null)}
        onCancel={(e) => { e.preventDefault(); close(); }}
        className="m-0 size-full max-h-none max-w-none bg-transparent p-0 backdrop:bg-[#050c0a]/95">
        {current && (
          <div className="relative flex size-full flex-col items-center justify-center gap-4 p-6">
            <div className="relative h-[72vh] w-full max-w-5xl">
              <Image src={current.src} alt={current.alt} fill sizes="100vw" className="rounded-xl object-contain" />
            </div>
            <p className="text-center text-white">
              <b className="font-display block text-xl">{current.alt}</b>
              <span className="text-[13px] uppercase tracking-[2px] text-saffron-500">
                {[current.year || "", current.category].filter(Boolean).join(" · ")}
              </span>
            </p>
            {[
              { label: "Close", fn: close, cls: "right-6 top-6", icon: <X className="size-5" aria-hidden /> },
              { label: "Previous photo", fn: () => step(-1), cls: "left-4 top-1/2", icon: <ChevronLeft className="size-6" aria-hidden /> },
              { label: "Next photo", fn: () => step(1), cls: "right-4 top-1/2", icon: <ChevronRight className="size-6" aria-hidden /> },
            ].map((b) => (
              <button key={b.label} type="button" aria-label={b.label} onClick={b.fn}
                className={`absolute flex size-12 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition hover:bg-saffron-600 ${b.cls}`}>{b.icon}</button>
            ))}
          </div>
        )}
      </dialog>
    </div>
  );
}
