"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export type Slide = { src: string; alt: string };

const INTERVAL_MS = 5000;

/** Hero photo slideshow: crossfade, pause on hover/focus, manual controls, no autoplay for reduced-motion users. */
export function HeroSlideshow({ slides, full = false }: { slides: Slide[]; full?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const playing = !paused && !reduced && count > 1;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, count]);

  const go = (n: number) => setIndex((n + count) % count);
  const btn = "flex size-10 items-center justify-center rounded-full bg-white/90 text-navy-900 shadow transition hover:bg-white focus-visible:outline-offset-2";

  return (
    <div
      role="region" aria-roledescription="carousel" aria-label="Photos from DISHA programmes"
      className={full ? "absolute inset-0 overflow-hidden bg-navy-900" : "relative size-full overflow-hidden rounded-[36px] bg-navy-700 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)]"}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div key={s.src} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === index ? "opacity-100" : "opacity-0"}`}>
          <Image src={s.src} alt={s.alt} fill priority={i === 0} sizes={full ? "100vw" : "(min-width:1024px) 40vw, 90vw"}
            className={`object-cover ${i === index && playing ? "scale-105 transition-transform duration-[6000ms] ease-out" : "scale-100"}`} />
        </div>
      ))}
      {full ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/65 to-navy-950/25" />
      ) : (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy-950/85 to-transparent" />
      )}
      <p hidden={full} className="absolute inset-x-5 bottom-14 text-sm font-medium leading-snug text-white drop-shadow" aria-live={playing ? "off" : "polite"}>
        {slides[index]?.alt}
      </p>
      {count > 1 && (
        <div className={full ? "absolute bottom-6 right-6 z-20 flex items-center gap-4" : "absolute inset-x-4 bottom-3 flex items-center justify-between"}>
          <div className="flex gap-1.5">
            {slides.map((s, i) => (
              <button key={s.src} type="button" onClick={() => go(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === index}
                className="flex size-6 items-center justify-center">
                <span className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-[#ffb27a]" : "w-2 bg-white/60"}`} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" className={btn} onClick={() => go(index - 1)} aria-label="Previous photo"><ChevronLeft className="size-5" aria-hidden /></button>
            {!reduced && (
              <button type="button" className={btn} onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play slideshow" : "Pause slideshow"}>
                {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
              </button>
            )}
            <button type="button" className={btn} onClick={() => go(index + 1)} aria-label="Next photo"><ChevronRight className="size-5" aria-hidden /></button>
          </div>
        </div>
      )}
    </div>
  );
}
