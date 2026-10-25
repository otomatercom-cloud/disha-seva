"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GalleryPhoto } from "@/lib/gallery";
import { cn } from "@/lib/utils";

// First tile is featured; the rest repeat a pattern so the grid feels editorial, not uniform.
const TILE = ["col-span-2 row-span-2", "", "", "row-span-2", "", "col-span-2"];

export function PhotoGallery({ photos, limit }: { photos: GalleryPhoto[]; limit?: number }) {
  const shown = limit ? photos.slice(0, limit) : photos;
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    dialogRef.current?.close();
    setOpen(null);
    lastTrigger.current?.focus();
  }, []);
  const step = useCallback(
    (dir: 1 | -1) => setOpen((i) => (i === null ? i : (i + dir + shown.length) % shown.length)),
    [shown.length],
  );

  useEffect(() => {
    if (open !== null && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [open]);

  const current = open === null ? null : shown[open];

  return (
    <>
      <ul className="grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[200px] sm:gap-4 md:grid-cols-4">
        {shown.map((p, i) => (
          <li key={p.src} className={cn("reveal", TILE[i % TILE.length])}>
            <button
              type="button"
              onClick={(e) => { lastTrigger.current = e.currentTarget; setOpen(i); }}
              aria-label={`Open photo: ${p.alt}`}
              className="group relative block size-full overflow-hidden rounded-3xl bg-navy-50 shadow-sm"
            >
              <Image src={p.src} alt={p.alt} fill sizes="(min-width:768px) 25vw, 50vw"
                className="object-cover transition duration-700 group-hover:scale-110" />
              <span className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-navy-950/70 via-transparent to-transparent p-4 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="text-sm font-semibold text-white">{p.alt}</span>
                <ZoomIn className="size-5 text-white" aria-hidden />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Photo viewer"
        onClose={() => setOpen(null)}
        onCancel={(e) => { e.preventDefault(); close(); }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto size-full max-h-none max-w-none bg-navy-950/95 p-0 backdrop:bg-transparent"
      >
        {current && (
          <div className="relative flex size-full flex-col items-center justify-center px-4 py-16 sm:px-20">
            <button type="button" onClick={close} aria-label="Close photo viewer"
              className="absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20">
              <X className="size-6" aria-hidden />
            </button>
            <button type="button" onClick={() => step(-1)} aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:left-6">
              <ChevronLeft className="size-7" aria-hidden />
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 sm:right-6">
              <ChevronRight className="size-7" aria-hidden />
            </button>
            <div key={current.src} className="anim-up relative h-full w-full max-w-5xl">
              <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" priority />
            </div>
            <p className="mt-4 text-center text-sm font-medium text-slate-200" aria-live="polite">
              {current.alt} <span className="text-slate-400">· {(open ?? 0) + 1} / {shown.length}</span>
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
