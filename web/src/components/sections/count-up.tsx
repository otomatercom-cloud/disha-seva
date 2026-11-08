"use client";

import { useEffect, useRef, useState } from "react";

/** Counts up to a numeric text ("3250", "3,250") once visible; non-numeric text is shown as-is. No animation for reduced-motion users. */
export function CountUp({ value }: { value: string }) {
  const end = Number(value.replace(/[^\d]/g, ""));
  const numeric = /^[\d,.\s]+$/.test(value.trim()) && end > 0;
  const [shown, setShown] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!numeric || !el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShown("0");
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - t0) / 2000, 1);
        setShown(Math.floor(end * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US"));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setShown(value);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [numeric, end, value]);

  return <span ref={ref} aria-label={value}>{shown}</span>;
}
