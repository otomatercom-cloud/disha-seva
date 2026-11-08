"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CopyLink } from "./copy-link";
import { api, btnDanger, btnGhost, errText, field } from "./api";

type Summary = { id: number; name: string; date: string; upcoming: boolean; published: boolean; open: boolean; capacity: number; total: number; by_region: Record<string, number> };
type Row = { id: number; reference: string; name: string; phone: string; email: string; region: string; place: string; attended: boolean; registered: string };

const csvCell = (v: string | number | boolean) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

function Detail({ eventId, regions, onBack }: { eventId: number; regions: Record<string, string>; onBack: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    const r = await api<{ registrations: Row[]; event: { name: string } }>("registrations", { query: { event_id: String(eventId) } });
    if (r.ok) { setRows(r.data.registrations); setName(r.data.event.name); } else setErr(errText(r));
  }, [eventId]);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => (rows ?? []).filter((r) => (!region || r.region === region) && (!q || `${r.name} ${r.phone} ${r.email} ${r.place} ${r.reference}`.toLowerCase().includes(q.toLowerCase()))), [rows, q, region]);

  function download() {
    const head = ["Reference", "Name", "Phone", "Email", "Province", "Place", "Registered", "Attended"];
    const body = shown.map((r) => [r.reference, r.name, r.phone, r.email, regions[r.region] ?? r.region, r.place, r.registered, r.attended ? "yes" : "no"]);
    const csv = [head, ...body].map((l) => l.map(csvCell).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `registrations-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || eventId}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  }
  async function act(id: number, body: Record<string, unknown>) {
    const r = await api("registrations", { body: { id, ...body } });
    if (r.ok) void load(); else setErr(errText(r));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button className={btnGhost} onClick={onBack}>← All events</button>
        <h2 className="text-xl">{name}</h2>
        <span className="rounded-full bg-navy-700 px-3 py-1 text-sm font-semibold text-white">{rows?.length ?? 0} registered</span>
        <span className="rounded-full bg-seva-50 px-3 py-1 text-sm font-semibold text-seva-700">{(rows ?? []).filter((r) => r.attended).length} attended</span>
        <CopyLink path={`/events/${eventId}`} label="Copy registration link" />
        <CopyLink path={`/admin/events/${eventId}`} label="Copy dashboard link" />
        <button className={btnGhost + " ml-auto"} onClick={download} disabled={!shown.length}>Download CSV ({shown.length})</button>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input aria-label="Search" placeholder="Search name, phone, email, place…" value={q} onChange={(e) => setQ(e.target.value)} className={field + " max-w-sm"} />
        <select aria-label="Province" value={region} onChange={(e) => setRegion(e.target.value)} className={field + " max-w-[220px]"}>
          <option value="">All provinces</option>{Object.entries(regions).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {err && <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {!rows ? <p className="text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Ref", "Name", "Phone", "Email", "Province", "Place", "Registered", "Attended", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{shown.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-xs text-slate-500">{r.reference}</td><td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.phone}</td><td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{regions[r.region] ?? r.region}</td><td className="px-3 py-2">{r.place}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{r.registered}</td>
                <td className="px-3 py-2"><input type="checkbox" aria-label={`Attended: ${r.name}`} checked={r.attended} onChange={(e) => act(r.id, { op: "attended", value: e.target.checked })} /></td>
                <td className="px-3 py-2"><button className={btnDanger} onClick={() => { if (confirm(`Remove ${r.name}?`)) void act(r.id, { op: "delete" }); }}>Remove</button></td>
              </tr>))}</tbody>
          </table>
          {!shown.length && <p className="p-6 text-slate-500">No registrations.</p>}
        </div>)}
    </div>
  );
}

/** Standalone dashboard for one event (used by /admin/events/[id]). */
export function EventDashboard({ eventId }: { eventId: number }) {
  const [regions, setRegions] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    void (async () => {
      const r = await api<{ regions: [string, string][] }>("registrations");
      setRegions(r.ok ? Object.fromEntries(r.data.regions) : {});
    })();
  }, []);
  if (!regions) return <p className="p-6 text-slate-500">Loading…</p>;
  return <Detail eventId={eventId} regions={regions} onBack={() => { window.location.href = "/admin"; }} />;
}

export function RegistrationsEditor() {
  const [events, setEvents] = useState<Summary[] | null>(null);
  const [regions, setRegions] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    void (async () => {
      const r = await api<{ events: Summary[]; regions: [string, string][] }>("registrations");
      if (r.ok) { setEvents(r.data.events); setRegions(Object.fromEntries(r.data.regions)); } else setErr(errText(r));
    })();
  }, [open]);

  if (open !== null) return <Detail eventId={open} regions={regions} onBack={() => setOpen(null)} />;
  if (!events) return <p className="p-6 text-slate-500">{err || "Loading…"}</p>;
  const total = events.reduce((n, e) => n + e.total, 0);
  const upcoming = events.filter((e) => e.upcoming);
  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[["Total registrations", total], ["Upcoming events", upcoming.length], ["Events with registrations", events.filter((e) => e.total).length]].map(([l, n]) => (
          <div key={l} className="rounded-xl border border-slate-200 bg-white p-4"><b className="font-display text-3xl text-navy-900">{n}</b><p className="text-sm text-slate-500">{l}</p></div>))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {events.map((e) => (
          <div key={e.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-navy-700 hover:shadow-md">
          <button onClick={() => setOpen(e.id)} className="text-left">
            <div className="flex items-start justify-between gap-2">
              <b className="text-navy-900">{e.name}</b>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.upcoming ? "bg-seva-50 text-seva-700" : "bg-slate-100 text-slate-500"}`}>{e.upcoming ? "Upcoming" : "Past"}</span>
            </div>
            <p className="text-xs text-slate-500">{e.date}{!e.open && " · registration off"}</p>
            <p className="mt-3"><b className="font-display text-3xl text-navy-900">{e.total}</b><span className="text-sm text-slate-500">{e.capacity ? ` / ${e.capacity} seats` : " registered"}</span></p>
            {e.capacity > 0 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-saffron-500" style={{ width: `${Math.min(100, (e.total / e.capacity) * 100)}%` }} /></div>}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(e.by_region).map(([k, n]) => <span key={k} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs text-navy-900">{(regions[k] ?? k).replace(" Province", "")}: {n}</span>)}
            </div>
          </button>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-sm">
            <a className="font-semibold text-navy-700 underline" href={`/admin/events/${e.id}`}>Open dashboard</a>
            <a className="text-slate-500 underline" href={`/events/${e.id}`} target="_blank" rel="noreferrer">Registration page</a>
          </div></div>))}
      </div>
      {!events.length && <p className="text-slate-500">No events yet.</p>}
    </div>
  );
}
