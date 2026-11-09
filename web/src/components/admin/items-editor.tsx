"use client";

import { useCallback, useEffect, useState } from "react";
import { api, btnDanger, btnGhost, btnPrimary, errText, field, fileToB64 } from "./api";

export type Item = { id: number; collection: string; title: string; text: string; icon: string; year: number; category: string; sequence: number; published: boolean; image: string; file: string; file_name: string };
export type Meta = { collections: [string, string][]; icons: [string, string][] };
const NO_ICON = ["gallery", "services", "goals", "member_tags", "hero_checks", "faq", "collab_cards", "reports", "steps", "helps"];
const THIS_YEAR = new Date().getFullYear();

export function Card({ it, meta, onChange, flash }: { it: Item; meta: Meta; onChange: () => void; flash: (m: string, bad?: boolean) => void }) {
  const [d, setD] = useState(it);
  const [busy, setBusy] = useState(false);
  useEffect(() => setD(it), [it]);
  const gallery = it.collection === "gallery";
  const dirty = JSON.stringify({ ...d, image: 0, file: 0 }) !== JSON.stringify({ ...it, image: 0, file: 0 });

  async function run(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const r = await api("items", { body: { id: it.id, ...body } });
    setBusy(false);
    if (r.ok) { flash(ok); onChange(); } else flash(errText(r), true);
  }
  const save = () => run({ op: "update", vals: { title: d.title, text: d.text, icon: d.icon, year: d.year, category: d.category, sequence: d.sequence, published: d.published } }, "Saved");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {(gallery || it.image) && (
        <div className="flex items-center gap-3">
          {it.image /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={it.image} alt="" className="h-28 w-40 rounded-lg border object-cover" /> : <span className="text-sm text-slate-400">No photo</span>}
          <label className={btnGhost + "cursor-pointer"}>Replace photo
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await run({ op: "update", vals: { image_b64: await fileToB64(f) } }, "Photo replaced"); }} />
          </label>
        </div>
      )}
      <label className="text-xs font-semibold text-slate-600">{gallery ? "Caption (also the screen-reader text)" : "Title"}
        <input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} className={field + " mt-1"} /></label>
      {!gallery && <label className="text-xs font-semibold text-slate-600">Text
        <textarea value={d.text} rows={3} onChange={(e) => setD({ ...d, text: e.target.value })} className={field + " mt-1"} /></label>}
      <div className="flex flex-wrap gap-3">
        {gallery && <>
          <label className="text-xs font-semibold text-slate-600">Year
            <input type="number" min={1990} max={2100} value={d.year} onChange={(e) => setD({ ...d, year: Number(e.target.value) })} className={field + " mt-1 w-24"} /></label>
          <label className="text-xs font-semibold text-slate-600">Category
            <input value={d.category} maxLength={40} onChange={(e) => setD({ ...d, category: e.target.value })} className={field + " mt-1 w-44"} placeholder="Yoga, Cultural…" /></label>
        </>}
        {!NO_ICON.includes(it.collection) && <label className="text-xs font-semibold text-slate-600">Icon
          <select value={d.icon} onChange={(e) => setD({ ...d, icon: e.target.value })} className={field + " mt-1 w-40"}><option value="">None</option>{meta.icons.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>}
        <label className="text-xs font-semibold text-slate-600">Order
          <input type="number" value={d.sequence} onChange={(e) => setD({ ...d, sequence: Number(e.target.value) })} className={field + " mt-1 w-20"} /></label>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={d.published} onChange={(e) => setD({ ...d, published: e.target.checked })} /> Published</label>
      </div>
      {it.collection === "reports" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {it.file ? <a href={it.file} target="_blank" rel="noreferrer" className="text-navy-700 underline">{it.file_name || "PDF"}</a> : <span className="text-slate-400">No PDF</span>}
          <label className={btnGhost + "cursor-pointer"}>Upload PDF
            <input type="file" accept="application/pdf" className="sr-only"
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await run({ op: "update", vals: { file_b64: await fileToB64(f), file_name: f.name } }, "PDF saved"); }} /></label>
          {it.file && <button className={btnDanger} onClick={() => run({ op: "update", vals: { clear_file: true } }, "PDF removed")}>Remove PDF</button>}
        </div>
      )}
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={!dirty || busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnDanger} disabled={busy} onClick={() => { if (confirm(`Delete "${it.title}"?`)) void run({ op: "delete" }, "Deleted"); }}>Delete</button>
      </div>
    </div>
  );
}

/** mode "lists": every text list except the gallery. mode "gallery": photo uploader + year/category editor. */
export function ItemsEditor({ mode }: { mode: "lists" | "gallery" }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [coll, setColl] = useState(mode === "gallery" ? "gallery" : "");
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const [year, setYear] = useState(THIS_YEAR);
  const [cat, setCat] = useState("");
  const [progress, setProgress] = useState("");

  const load = useCallback(async () => {
    const r = await api<Meta & { items: Item[] }>("items", { query: coll ? { collection: coll } : {} });
    if (r.ok) { setMeta({ collections: r.data.collections, icons: r.data.icons }); setItems(r.data.items); if (!coll && mode === "lists") setColl(r.data.collections.find(([k]) => k !== "gallery")![0]); }
    else setMsg({ m: errText(r), bad: true });
  }, [coll, mode]);
  useEffect(() => { void load(); }, [load]);
  const flash = (m: string, bad = false) => { setMsg({ m, bad }); window.setTimeout(() => setMsg(null), 3500); };

  async function upload(files: FileList) {
    let ok = 0;
    for (const [i, f] of [...files].entries()) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      const title = f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
      const r = await api("items", { body: { op: "create", vals: { collection: "gallery", title, year, category: cat, sequence: 10, image_b64: await fileToB64(f) } } });
      if (r.ok) ok++; else flash(`${f.name}: ${errText(r)}`, true);
    }
    setProgress(""); flash(`${ok} photo(s) uploaded. Edit the captions below.`); void load();
  }
  async function add() {
    const r = await api("items", { body: { op: "create", vals: { collection: coll, title: "New item", sequence: 100 } } });
    if (r.ok) load(); else flash(errText(r), true);
  }

  if (!meta) return <p className="p-6 text-slate-500">{msg?.m ?? "Loading…"}</p>;
  return (
    <div>
      {mode === "lists" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <select aria-label="List" value={coll} onChange={(e) => setColl(e.target.value)} className={field + " max-w-sm"}>
            {meta.collections.filter(([k]) => k !== "gallery").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <button className={btnPrimary} onClick={add}>+ Add item</button>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-navy-700/40 bg-white p-4">
          <label className="text-xs font-semibold text-slate-600">Year<input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} className={field + " mt-1 w-24"} /></label>
          <label className="text-xs font-semibold text-slate-600">Category<input value={cat} onChange={(e) => setCat(e.target.value)} maxLength={40} placeholder="Yoga, Cultural…" className={field + " mt-1 w-48"} /></label>
          <label className={btnPrimary + "cursor-pointer"}>{progress || "Upload photos"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={!!progress}
              onChange={(e) => { const f = e.target.files; if (f?.length) void upload(f); e.target.value = ""; }} /></label>
          <span className="text-sm text-slate-500">Select many photos at once. They get this year and category.</span>
        </div>
      )}
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((it) => <Card key={it.id} it={it} meta={meta} onChange={load} flash={flash} />)}</div>
      {!items.length && <p className="text-slate-500">Nothing here yet.</p>}
    </div>
  );
}
