"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Paragraph that shows the first `lines` lines and a "Read more / Show less" button only when the text is longer. */
export function ReadMore({ children, className = "", lines = 6, more = "Read more", less = "Show less" }: {
  children: ReactNode; className?: string; lines?: number; more?: string; less?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const id = useId();
  const measure = useCallback(() => {
    const el = ref.current;
    if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1);
  }, [open]);
  useLayoutEffect(measure, [measure, children]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return (
    <div>
      <p id={id} ref={ref} className={className}
        style={open ? undefined : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{children}</p>
      {(long || open) && (
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}
          className="mt-2 text-sm font-semibold text-saffron-700 underline underline-offset-2 hover:text-saffron-600">{open ? less : more}</button>
      )}
    </div>
  );
}
