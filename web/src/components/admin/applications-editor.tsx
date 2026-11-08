"use client";

import { useCallback, useEffect, useState } from "react";
import { api, btnDanger, btnGhost, btnPrimary, errText, field } from "./api";

type App = { id: number; name: string; full_name: string; category: string; state: string; region: string; city: string; email: string; mobile: string; applied: string; duplicates: number; member_number: string };
const STATES = ["", "new", "under_review", "contacted", "approved", "rejected"];

export function ApplicationsEditor() {
  const [apps, setApps] = useState<App[] | null>(null);
  const [state, setState] = useState("new");
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const [busy, setBusy] = useState(0);
  const load = useCallback(async () => {
    const r = await api<{ applications: App[] }>("applications", { query: state ? { state } : {} });
    if (r.ok) setApps(r.data.applications); else setMsg({ m: errText(r), bad: true });
  }, [state]);
  useEffect(() => { void load(); }, [load]);
  async function act(a: App, op: string) {
    if (op === "approve" && !confirm(`Approve ${a.full_name}? A member record is created and the ID card is emailed.`)) return;
    if (op === "reject" && !confirm(`Reject ${a.full_name}?`)) return;
    setBusy(a.id);
    const r = await api("applications", { body: { id: a.id, op } });
    setBusy(0);
    setMsg({ m: r.ok ? "Done" : errText(r), bad: !r.ok }); window.setTimeout(() => setMsg(null), 4000);
    if (r.ok) void load();
  }
  return (
    <div>
      <select aria-label="Status" value={state} onChange={(e) => setState(e.target.value)} className={field + " mb-5 max-w-xs"}>
        {STATES.map((s) => <option key={s} value={s}>{s ? s.replace("_", " ") : "All"}</option>)}</select>
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
      {!apps ? <p className="text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Application", "Name", "Category", "Province / city", "Contact", "Status", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{apps.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2"><b>{a.name}</b><br /><span className="text-xs text-slate-500">{a.applied.slice(0, 10)}</span></td>
                <td className="px-3 py-2">{a.full_name}{a.duplicates > 0 && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">possible duplicate</span>}</td>
                <td className="px-3 py-2 capitalize">{a.category}</td>
                <td className="px-3 py-2 capitalize">{a.region} · {a.city}</td>
                <td className="px-3 py-2">{a.email}<br />{a.mobile}</td>
                <td className="px-3 py-2 capitalize">{a.state.replace("_", " ")}{a.member_number && <><br /><span className="text-xs text-slate-500">{a.member_number}</span></>}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">
                  {a.state !== "approved" && <button disabled={busy === a.id} className={btnPrimary} onClick={() => act(a, "approve")}>Approve</button>}
                  {a.state !== "approved" && a.state !== "rejected" && <button disabled={busy === a.id} className={btnDanger} onClick={() => act(a, "reject")}>Reject</button>}
                  {a.state === "new" && <button disabled={busy === a.id} className={btnGhost} onClick={() => act(a, "review")}>Review</button>}
                </div></td>
              </tr>))}</tbody>
          </table>
          {!apps.length && <p className="p-6 text-slate-500">No applications.</p>}
        </div>)}
      <p className="mt-3 text-xs text-slate-500">Passport and Iqama numbers are only visible inside Odoo.</p>
    </div>
  );
}
