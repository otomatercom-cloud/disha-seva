"use client";

import { Compass, Target } from "lucide-react";
import { useEffect, useState } from "react";

export type VMItem = { label: string; text: string };
const INTERVAL_MS = 6000;

/** Hero panel that alternates Vision and Mission. Pauses on hover/focus; stacked (no motion) for reduced-motion users. */
export function VisionMission({ items }: { items: VMItem[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const n = items.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const u = () => setReduced(mq.matches);
    u(); mq.addEventListener("change", u);
    return () => mq.removeEventListener("change", u);
  }, []);
  const playing = !paused && !reduced && n > 1;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setI((x) => (x + 1) % n), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, n]);

  if (!n) return null;
  const Icon = (k: number) => (k === 0 ? Target : Compass);

  return (
    <div
      role="region" aria-roledescription="carousel" aria-label="Vision and mission"
      className="pointer-events-auto w-full max-w-md rounded-[22px] border border-white/25 bg-navy-950/55 p-6 text-white shadow-2xl backdrop-blur-md"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      <div className="grid">
        {items.map((it, k) => {
          const Ic = Icon(k);
          const active = reduced || k === i;
          return (
            <div key={it.label} role="group" aria-roledescription="slide" aria-label={`${k + 1} of ${n}`}
              aria-hidden={!active}
              className={`col-start-1 row-start-1 transition-all duration-700 ${reduced ? "mb-4 last:mb-0" : active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-8 opacity-0"}`}
              style={reduced ? { gridRow: k + 1 } : undefined}>
              <span className="mb-3 flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[1.5px] text-saffron-500">
                <Ic className="size-5" aria-hidden />{it.label}
              </span>
              <p className="text-[15px] leading-relaxed text-[#e4f1ea]">{it.text}</p>
            </div>
          );
        })}
      </div>
      {n > 1 && !reduced && (
        <div className="mt-5 flex gap-2">
          {items.map((it, k) => (
            <button key={it.label} type="button" aria-label={`Show ${it.label}`} aria-current={k === i} onClick={() => setI(k)}
              className="flex h-6 items-center"><span className={`h-1.5 rounded-full transition-all ${k === i ? "w-8 bg-saffron-500" : "w-4 bg-white/40"}`} /></button>
          ))}
        </div>
      )}
    </div>
  );
}
