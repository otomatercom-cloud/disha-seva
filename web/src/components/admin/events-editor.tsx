"use client";

import { useCallback, useEffect, useState } from "react";
import { CopyLink } from "./copy-link";
import { api, btnDanger, btnGhost, btnPrimary, errText, field, fileToB64 } from "./api";

type Ev = { id: number; name: string; event_date: string; end_date: string; time_text: string; region: string; location: string; details: string; published: boolean; image: string; registration_open: boolean; capacity: number; registration_count: number };
const today = () => new Date().toISOString().slice(0, 10);

function EventCard({ e, regions, reload, flash }: { e: Ev; regions: [string, string][]; reload: () => void; flash: (m: string, bad?: boolean) => void }) {
  const [d, setD] = useState(e);
  const [busy, setBusy] = useState(false);
  useEffect(() => setD(e), [e]);
  const dirty = JSON.stringify({ ...d, image: 0 }) !== JSON.stringify({ ...e, image: 0 });
  async function run(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const r = await api("events", { body: { id: e.id, ...body } });
    setBusy(false);
    if (r.ok) { flash(ok); reload(); } else flash(errText(r), true);
  }
  const lab = "text-xs font-semibold text-slate-600";
  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className={lab}>Event title<input value={d.name} onChange={(x) => setD({ ...d, name: x.target.value })} className={field + " mt-1"} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className={lab}>Date<input type="date" value={d.event_date} onChange={(x) => setD({ ...d, event_date: x.target.value })} className={field + " mt-1"} /></label>
        <label className={lab}>End date (optional)<input type="date" value={d.end_date} onChange={(x) => setD({ ...d, end_date: x.target.value })} className={field + " mt-1"} /></label>
        <label className={lab}>Time<input value={d.time_text} onChange={(x) => setD({ ...d, time_text: x.target.value })} placeholder="6:00 PM onwards" className={field + " mt-1"} /></label>
        <label className={lab}>Province<select value={d.region} onChange={(x) => setD({ ...d, region: x.target.value })} className={field + " mt-1"}>{regions.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <div className="flex flex-wrap items-end gap-4 rounded-lg bg-navy-50 p-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.registration_open} onChange={(x) => setD({ ...d, registration_open: x.target.checked })} /> Online registration</label>
        {d.registration_open && <label className={lab}>Seats (0 = unlimited)<input type="number" min={0} value={d.capacity} onChange={(x) => setD({ ...d, capacity: Math.max(0, Number(x.target.value)) })} className={field + " mt-1 w-28"} /></label>}
        <span className="ml-auto flex flex-wrap items-center gap-3 text-sm font-semibold text-navy-900">{e.registration_count} registered
          {e.id > 0 && <><a className="underline" href={`/admin/events/${e.id}`}>Dashboard</a><CopyLink path={`/events/${e.id}`} label="Copy registration link" /></>}</span>
      </div>
      <label className={lab}>Place<input value={d.location} onChange={(x) => setD({ ...d, location: x.target.value })} className={field + " mt-1"} /></label>
      <label className={lab}>Details<textarea rows={3} value={d.details} onChange={(x) => setD({ ...d, details: x.target.value })} className={field + " mt-1"} /></label>
      <div className="flex flex-wrap items-center gap-3">
        {e.image /* eslint-disable-next-line @next/next/no-img-element */ && <img src={e.image} alt="" className="h-16 w-24 rounded border object-cover" />}
        <label className={btnGhost + "cursor-pointer"}>{e.image ? "Replace photo" : "Add photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
            onChange={async (x) => { const f = x.target.files?.[0]; x.target.value = ""; if (f) await run({ op: "update", vals: { image_b64: await fileToB64(f) } }, "Photo saved"); }} /></label>
        {e.image && <button className={btnDanger} onClick={() => run({ op: "update", vals: { clear_image: true } }, "Photo removed")}>Remove photo</button>}
        <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={d.published} onChange={(x) => setD({ ...d, published: x.target.checked })} /> Published</label>
      </div>
      <div className="flex gap-2">
        <button className={btnPrimary} disabled={!dirty || busy} onClick={() => run({ op: "update", vals: { name: d.name, event_date: d.event_date, end_date: d.end_date, time_text: d.time_text, region: d.region, location: d.location, details: d.details, published: d.published, registration_open: d.registration_open, capacity: d.capacity } }, "Saved")}>{busy ? "Saving…" : "Save"}</button>
        <button className={btnDanger} disabled={busy} onClick={() => { if (confirm(`Delete "${e.name}"?`)) void run({ op: "delete" }, "Deleted"); }}>Delete</button>
      </div>
    </div>
  );
}

export function EventsEditor() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [regions, setRegions] = useState<[string, string][]>([]);
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ events: Ev[]; regions: [string, string][] }>("events");
    if (r.ok) { setEvents(r.data.events); setRegions(r.data.regions); } else setMsg({ m: errText(r), bad: true });
  }, []);
  useEffect(() => { void load(); }, [load]);
  const flash = (m: string, bad = false) => { setMsg({ m, bad }); window.setTimeout(() => setMsg(null), 3500); };
  async function add() {
    const r = await api("events", { body: { op: "create", vals: { name: "New event", event_date: today(), region: "all", published: false } } });
    if (r.ok) load(); else flash(errText(r), true);
  }
  if (!events) return <p className="p-6 text-slate-500">{msg?.m ?? "Loading…"}</p>;
  return (
    <div>
      <button className={btnPrimary + " mb-5"} onClick={add}>+ Add event</button>
      <p className="mb-5 text-sm text-slate-500">New events start unpublished. Tick Published when ready. To email members of a province use Odoo: Website Content &gt; Events &gt; Email Members.</p>
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
      <div className="grid gap-4 lg:grid-cols-2">{events.map((e) => <EventCard key={e.id} e={e} regions={regions} reload={load} flash={flash} />)}</div>
    </div>
  );
}
