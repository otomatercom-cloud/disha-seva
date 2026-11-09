"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, btnGhost, errText, field } from "./api";
import { Row, type Text } from "./texts-editor";

/** Text "page" label -> public URL shown in the live preview. */
export const PAGE_URLS: Record<string, string> = {
  Home: "/", About: "/about", Activities: "/seva-activities", Contact: "/contact", Events: "/", Gallery: "/gallery",
  "Indians in KSA": "/indians-in-ksa", Legal: "/privacy-policy", "Membership page": "/membership", Partners: "/collaborations",
  Reports: "/reports", Support: "/support",
};
const SECTION_NAMES: Record<string, string> = {
  main: "Page heading & intro", hero: "Hero (top banner)", intro: "Intro", impact: "Impact numbers", pillars: "Pillars",
  events: "Events section", moments: "Photo moments", collab: "Collaborations", join: "Join / call to action", vision: "Vision",
  mission: "Mission", team: "Team", forums: "Forums", formation: "Formation", reg: "Event registration form", faq: "FAQ",
  enquiry: "Enquiry", help: "Help", gallery: "Gallery", track: "Track a request",
};
const sectionOf = (key: string) => { const p = key.split("."); return p.length >= 3 ? p[1] : "main"; };
const sectionLabel = (s: string) => SECTION_NAMES[s] ?? s.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Marks every element of the previewed page that shows an editable text/image, so a click selects its field.
 * Returns the number of marked elements. Works on any same-origin document.
 */
export function markEditable(doc: Document, texts: Pick<Text, "key" | "kind" | "value" | "image">[]): number {
  const byValue = new Map<string, string>();
  const images: [string, string][] = [];
  for (const t of texts) {
    if (t.kind === "image") { if (t.image) images.push([t.key, t.image.split("?")[0]]); continue; }
    if (t.kind === "long" || t.key.startsWith("theme.") || t.key.startsWith("navshow.")) continue;
    const v = norm(t.value);
    if (v.length > 1 && v.length <= 400 && !byValue.has(v)) byValue.set(v, t.key);
  }
  let n = 0;
  const mark = (el: Element | null, key: string) => { if (el && !el.hasAttribute("data-ed")) { el.setAttribute("data-ed", key); n++; } };
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const key = byValue.get(norm(node.textContent ?? ""));
    if (key && node.parentElement && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.parentElement.tagName)) mark(node.parentElement, key);
  }
  doc.querySelectorAll("img").forEach((img) => {
    const src = decodeURIComponent(img.currentSrc || img.getAttribute("src") || "");
    const hit = images.find(([, u]) => u && src.includes(u));
    if (hit) mark(img, hit[0]);
  });
  return n;
}

const PREVIEW_CSS = `[data-ed]{cursor:pointer!important;transition:outline-color .15s}
[data-ed]:hover{outline:2px dashed #f58b1f!important;outline-offset:3px}
[data-ed].ed-on{outline:3px solid #f58b1f!important;outline-offset:3px}`;

const DEVICES = { desktop: 1280, tablet: 768, mobile: 390 } as const;
type Device = keyof typeof DEVICES;

export function PageEditor() {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [page, setPage] = useState("Home");
  const [section, setSection] = useState("hero");
  const [activeKey, setActiveKey] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(800);
  const textsRef = useRef<Text[]>([]);
  const pagesRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    const r = await api<{ texts: Text[] }>("texts");
    if (r.ok) setTexts(r.data.texts); else setErr(errText(r));
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { textsRef.current = texts ?? []; }, [texts]);

  const content = useMemo(() => (texts ?? []).filter((t) => t.page in PAGE_URLS), [texts]);
  const pages = useMemo(() => Object.keys(PAGE_URLS).filter((p) => content.some((t) => t.page === p)), [content]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const sections = useMemo(() => [...new Set(content.filter((t) => t.page === page).map((t) => sectionOf(t.key)))], [content, page]);
  const rows = content.filter((t) => t.page === page && sectionOf(t.key) === section);

  useEffect(() => { if (sections.length && !sections.includes(section)) setSection(sections[0]); }, [sections, section]);
  useEffect(() => {
    const el = box.current; if (!el) return;
    setBoxW(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth)); ro.observe(el);
    return () => ro.disconnect();
  }, [texts]);

  // choosing a section scrolls the preview to it
  useEffect(() => {
    const keys = new Set(rows.map((r) => r.key));
    const id = window.setTimeout(() => {
      const doc = frame.current?.contentDocument;
      const el = [...(doc?.querySelectorAll("[data-ed]") ?? [])].find((e) => keys.has(e.getAttribute("data-ed") ?? ""));
      el?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 150);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, page]);

  const select = useCallback((key: string) => {
    const t = textsRef.current.find((x) => x.key === key); if (!t) return;
    if (t.page in PAGE_URLS) setPage(t.page);
    setSection(sectionOf(key)); setActiveKey(key);
    window.setTimeout(() => document.getElementById(`row-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
  }, []);

  function onFrameLoad() {
    const doc = frame.current?.contentDocument; if (!doc?.body) return;
    const css = doc.createElement("style"); css.textContent = PREVIEW_CSS; doc.head.appendChild(css);
    markEditable(doc, textsRef.current);
    doc.addEventListener("click", (e) => {
      const target = e.target as Element;
      const ed = target.closest("[data-ed]");
      const a = target.closest("a");
      if (ed || a) e.preventDefault();               // the preview never navigates away on its own
      if (ed) { doc.querySelectorAll(".ed-on").forEach((x) => x.classList.remove("ed-on")); ed.classList.add("ed-on"); select(ed.getAttribute("data-ed")!); return; }
      if (a) {
        const path = new URL(a.href, doc.baseURI).pathname.replace(/(.)\/$/, "$1");
        const hit = pagesRef.current.find((p) => PAGE_URLS[p] === path);
        if (hit) { setPage(hit); setActiveKey(""); }
      }
    }, true);
  }
  const reload = () => frame.current?.contentWindow?.location.reload();
  const saved = () => { void load(); window.setTimeout(reload, 700); setMsg({ m: "Saved", bad: false }); window.setTimeout(() => setMsg(null), 2500); };
  const flash = (m: string, bad = false) => { setMsg({ m, bad }); window.setTimeout(() => setMsg(null), 3500); };

  if (!texts) return <p className="p-6 text-slate-500">{err || "Loading…"}</p>;
  const w = DEVICES[device];
  const k = device === "desktop" ? Math.min(1, boxW / w) : 1;
  const frameW = device === "desktop" ? w : Math.min(w, boxW);
  return (
    <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
        <label className="text-sm font-semibold text-slate-700">Page
          <select value={page} onChange={(e) => { setPage(e.target.value); setActiveKey(""); }} className={field + " mt-1"}>{pages.map((p) => <option key={p}>{p}</option>)}</select>
        </label>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Sections on this page</p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s) => (
              <button key={s} onClick={() => { setSection(s); setActiveKey(""); }} aria-pressed={section === s}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${section === s ? "border-navy-700 bg-navy-700 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>{sectionLabel(s)}</button>))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Tip: click any text or picture in the preview to edit it.</p>
        </div>
        <div className="grid gap-3">
          {rows.map((t) => (
            <div id={`row-${t.key}`} key={t.id} className={activeKey === t.key ? "rounded-xl ring-4 ring-saffron-500/60" : ""}>
              <Row t={t} onSaved={saved} flash={flash} />
            </div>))}
          {!rows.length && <p className="text-slate-500">No editable text in this section.</p>}
        </div>
        {page === "Home" && section === "hero" && <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-900">Hero highlight cards, tick list and slideshow photos are edited in <b>Lists &amp; cards</b> and <b>Gallery</b>.</p>}
      </aside>
      <section className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {(Object.keys(DEVICES) as Device[]).map((d) => (
            <button key={d} onClick={() => setDevice(d)} aria-pressed={device === d} className={btnGhost + (device === d ? " !border-navy-700 !bg-navy-50" : "")}>{d[0].toUpperCase() + d.slice(1)}</button>))}
          <button className={btnGhost} onClick={reload}>Refresh</button>
          <a className={btnGhost} href={PAGE_URLS[page]} target="_blank" rel="noreferrer">Open page ↗</a>
        </div>
        <div ref={box} className="overflow-hidden rounded-xl border border-slate-300 bg-slate-100">
          <div style={{ height: 720, display: "flex", justifyContent: "center" }}>
            <iframe ref={frame} key={PAGE_URLS[page]} title="Live preview" src={PAGE_URLS[page]} onLoad={onFrameLoad}
              style={{ width: frameW, height: device === "desktop" ? 720 / k : 720, border: 0, background: "#fff", transform: `scale(${k})`, transformOrigin: "top center", flex: "none" }} />
          </div>
        </div>
      </section>
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
    </div>
  );
}
