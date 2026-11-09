"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, btnGhost, errText, field } from "./api";
import { Card, type Item, type Meta } from "./items-editor";
import { Row, type Text } from "./texts-editor";

/** Text "page" label -> public URL shown in the live preview. */
export const PAGE_URLS: Record<string, string> = {
  Home: "/", About: "/about", Activities: "/seva-activities", Contact: "/contact", Events: "/", Gallery: "/gallery",
  "Indians in KSA": "/indians-in-ksa", Legal: "/privacy-policy", "Membership page": "/membership", Partners: "/collaborations",
  Reports: "/reports", Support: "/support",
};
/** Which card/list collections appear on which page (edited in the "Cards & lists" panel). */
export const PAGE_COLLECTIONS: Record<string, string[]> = {
  Home: ["hero_checks", "hero_cards", "services", "goals", "pillars", "impact", "member_tags"],
  About: ["stats", "goals", "forums", "team", "support"], Activities: ["activities"], "Indians in KSA": ["helps", "faq"],
  Partners: ["collab_cards"], Reports: ["reports"], "Membership page": ["steps"], Support: ["support_steps"], Gallery: ["gallery"],
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

/** Plain text of a markdown-ish block as it is shown on the page (no ##, bullets, **bold**, links). */
const plain = (s: string) => s.replace(/^\s*(#{1,6}\s+|[-*]\s+|\d+\.\s+)/gm, "").replace(/\*\*|__/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

/**
 * Marks every element of the previewed page that shows an editable text, card or image, so a click selects it.
 * Texts get `data-ed="<key>"`, cards/list items `data-edi="<id>"`. Long articles are matched paragraph by paragraph.
 * Returns the number of marked elements. Works on any same-origin document.
 */
export function markEditable(doc: Document, texts: Pick<Text, "key" | "kind" | "value" | "image">[], items: Pick<Item, "id" | "title" | "text" | "image">[] = []): number {
  const targets = new Map<string, ["ed" | "edi", string]>();
  const add = (raw: string, t: ["ed" | "edi", string]) => { const v = norm(raw); if (v.length > 1 && v.length <= 3000 && !targets.has(v)) targets.set(v, t); };
  const images: [string, string][] = [];
  for (const t of texts) {
    if (t.kind === "image") { if (t.image) images.push([t.key, t.image.split("?")[0]]); continue; }
    if (t.key.startsWith("theme.") || t.key.startsWith("navshow.")) continue;
    add(t.value, ["ed", t.key]);
    if (t.kind === "long" || t.value.includes("\n")) for (const block of t.value.split(/\n{2,}/)) { add(plain(block), ["ed", t.key]); for (const line of plain(block).split("\n")) add(line, ["ed", t.key]); }
  }
  for (const it of items) { add(it.title, ["edi", String(it.id)]); if (it.text) add(it.text, ["edi", String(it.id)]); }
  let n = 0;
  const mark = (el: Element, [attr, id]: ["ed" | "edi", string]) => { if (!el.hasAttribute("data-ed") && !el.hasAttribute("data-edi")) { el.setAttribute("data-" + attr, id); n++; } };
  const els = [...doc.body.querySelectorAll("*")].reverse();          // deepest element first
  for (const el of els) {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "IMG", "SVG", "PATH"].includes(el.tagName.toUpperCase()) || el.querySelector("[data-ed],[data-edi]")) continue;
    const hit = targets.get(norm(el.textContent ?? ""));
    if (hit) mark(el, hit);
  }
  doc.querySelectorAll("img").forEach((img) => {
    const src = decodeURIComponent(img.currentSrc || img.getAttribute("src") || "");
    const hit = images.find(([, u]) => u && src.includes(u));
    if (hit) mark(img, ["ed", hit[0]]);
    else { const it = items.find((x) => x.image && src.includes(x.image.split("?")[0])); if (it) mark(img, ["edi", String(it.id)]); }
  });
  return n;
}

const PREVIEW_CSS = `[data-ed],[data-edi]{cursor:pointer!important;transition:outline-color .15s}
[data-ed]:hover,[data-edi]:hover{outline:2px dashed #f58b1f!important;outline-offset:3px}
.ed-on{outline:3px solid #f58b1f!important;outline-offset:3px}`;

const DEVICES = { desktop: 1280, tablet: 768, mobile: 390 } as const;
type Device = keyof typeof DEVICES;

export function PageEditor() {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [page, setPage] = useState("Home");
  const [section, setSection] = useState("hero");
  const [activeKey, setActiveKey] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [items, setItems] = useState<Item[]>([]);
  const [meta, setMeta] = useState<Meta>({ collections: [], icons: [] });
  const [activeItem, setActiveItem] = useState(0);
  const [coll, setColl] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(800);
  const textsRef = useRef<Text[]>([]);
  const itemsRef = useRef<Item[]>([]);
  const pageRef = useRef("Home");
  const [pinned, setPinned] = useState("");
  const pagesRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    const r = await api<{ texts: Text[] }>("texts");
    if (r.ok) setTexts(r.data.texts); else setErr(errText(r));
    const i = await api<Meta & { items: Item[] }>("items");
    if (i.ok) { setItems(i.data.items); setMeta({ collections: i.data.collections, icons: i.data.icons }); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { textsRef.current = texts ?? []; }, [texts]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const content = useMemo(() => (texts ?? []).filter((t) => t.page in PAGE_URLS), [texts]);
  const pages = useMemo(() => Object.keys(PAGE_URLS).filter((p) => content.some((t) => t.page === p)), [content]);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  const sections = useMemo(() => [...new Set(content.filter((t) => t.page === page).map((t) => sectionOf(t.key)))], [content, page]);
  const colls = (PAGE_COLLECTIONS[page] ?? []).filter((k) => meta.collections.some(([c]) => c === k));
  const collItems = items.filter((i) => i.collection === coll);
  const editing = items.find((i) => i.id === activeItem);
  useEffect(() => { if (colls.length && !colls.includes(coll)) setColl(colls[0]); }, [colls, coll]);
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
    if (t.page in PAGE_URLS) { setPage(t.page); setPinned(""); setSection(sectionOf(key)); }
    else setPinned(key);                              // menu / footer / site-wide text: shown on its own at the top
    setActiveKey(key);
    window.setTimeout(() => document.getElementById(`row-${key}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 60);
  }, []);

  function onFrameLoad() {
    const doc = frame.current?.contentDocument; if (!doc?.body) return;
    const css = doc.createElement("style"); css.textContent = PREVIEW_CSS; doc.head.appendChild(css);
    // when two keys show the same words, the ones that belong to this page win
    const cur = pageRef.current, cols = PAGE_COLLECTIONS[cur] ?? [];
    markEditable(doc, [...textsRef.current].sort((a, b) => Number(b.page === cur) - Number(a.page === cur)),
      [...itemsRef.current].sort((a, b) => Number(cols.includes(b.collection)) - Number(cols.includes(a.collection))));
    doc.addEventListener("click", (e) => {
      const target = e.target as Element;
      const ed = target.closest("[data-ed],[data-edi]");
      const a = target.closest("a");
      if (ed || a) e.preventDefault();               // the preview never navigates away on its own
      if (ed) {
        doc.querySelectorAll(".ed-on").forEach((x) => x.classList.remove("ed-on")); ed.classList.add("ed-on");
        const itemId = ed.getAttribute("data-edi");
        if (itemId) { const it = itemsRef.current.find((x) => x.id === Number(itemId)); setActiveItem(Number(itemId)); if (it) setColl(it.collection); setActiveKey(""); window.setTimeout(() => document.getElementById("item-editor")?.scrollIntoView({ block: "start", behavior: "smooth" }), 60); }
        else { setActiveItem(0); select(ed.getAttribute("data-ed")!); }
        return;
      }
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
        {pinned && (() => { const t = texts.find((x) => x.key === pinned); return t ? (
          <div id={`row-${t.key}`} className="rounded-xl ring-4 ring-saffron-500/60">
            <p className="flex items-center justify-between rounded-t-xl bg-saffron-50 px-4 py-2 text-xs font-semibold text-saffron-700">Site-wide text ({t.page})<button className="underline" onClick={() => setPinned("")}>Close</button></p>
            <Row t={t} onSaved={saved} flash={flash} />
          </div>) : null; })()}
        {editing && (
          <div id="item-editor" className="rounded-xl ring-4 ring-saffron-500/60">
            <p className="flex items-center justify-between rounded-t-xl bg-saffron-50 px-4 py-2 text-xs font-semibold text-saffron-700">Editing card: {meta.collections.find(([k]) => k === editing.collection)?.[1]}
              <button className="underline" onClick={() => setActiveItem(0)}>Close</button></p>
            <Card it={editing} meta={meta} onChange={saved} flash={flash} />
          </div>)}
        <div className="grid gap-3">
          {rows.map((t) => (
            <div id={`row-${t.key}`} key={t.id} className={activeKey === t.key ? "rounded-xl ring-4 ring-saffron-500/60" : ""}>
              <Row t={t} onSaved={saved} flash={flash} />
            </div>))}
          {!rows.length && <p className="text-slate-500">No editable text in this section.</p>}
        </div>
        {colls.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Cards &amp; lists on this page</p>
            <div className="flex flex-wrap gap-2">
              <select aria-label="List" value={coll} onChange={(e) => { setColl(e.target.value); setActiveItem(0); }} className={field + " max-w-[260px]"}>
                {colls.map((k) => <option key={k} value={k}>{meta.collections.find(([c]) => c === k)?.[1] ?? k}</option>)}</select>
              <button className={btnGhost} onClick={async () => { const r = await api("items", { body: { op: "create", vals: { collection: coll, title: "New item", sequence: 100 } } }); if (r.ok) saved(); else flash(errText(r), true); }}>+ Add</button>
            </div>
            <ul className="mt-2 grid gap-1">
              {collItems.map((i) => <li key={i.id}><button onClick={() => { setActiveItem(i.id); window.setTimeout(() => document.getElementById("item-editor")?.scrollIntoView({ block: "start", behavior: "smooth" }), 60); }}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-slate-50 ${activeItem === i.id ? "bg-navy-50 font-semibold" : ""}`}>{i.title || "(no title)"}</button></li>)}
              {!collItems.length && <li className="text-sm text-slate-500">Empty.</li>}
            </ul>
          </div>)}
        {page === "Home" && section === "hero" && <p className="rounded-lg bg-navy-50 p-3 text-xs text-navy-900">Slideshow photos are uploaded in the <b>Gallery</b> tab.</p>}
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
