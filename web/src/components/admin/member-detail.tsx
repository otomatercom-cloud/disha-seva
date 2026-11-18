"use client";

import { useEffect, useState } from "react";
import { api, btnGhost, errText } from "./api";

type Detail = {
  id: number; name: string; state: string; category: string; photo: string; applied: string; approved: string; approved_by: string; duplicates: number; source: string;
  member: { id: number; number: string; status: string } | null;
  membership: Record<string, string> | null;
  terms?: { kind: string; start: string; end: string; note: string; by: string }[];
  sections: { title: string; rows: [string, string][] }[];
};

/** Read-only review panel (like the Odoo form): photo, status, every field of the application, masked ID numbers. */
export function MemberDetail({ appId, onClose, children, refresh = 0 }: { appId: number; onClose: () => void; children?: React.ReactNode; refresh?: number }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    void (async () => {
      const r = await api<{ application: Detail }>("members", { query: { app_id: String(appId) } });
      if (!live) return;
      if (r.ok) setD(r.data.application); else setErr(errText(r));
    })();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { live = false; window.removeEventListener("keydown", esc); };
  }, [appId, onClose, refresh]);
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label="Member details" onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3">
          <b className="text-navy-900">{d ? d.name : "Details"}</b>
          <button className={btnGhost} onClick={onClose}>Close</button>
        </div>
        {err && <p role="alert" className="m-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        {!d && !err && <p className="p-6 text-slate-500">Loading…</p>}
        {d && (
          <div className="space-y-5 p-5">
            <div className="flex gap-4">
              {d.photo /* eslint-disable-next-line @next/next/no-img-element */ ? <img src={d.photo} alt="Applicant photo" className="h-32 w-24 flex-none rounded-lg border object-cover" />
                : <div className="flex h-32 w-24 flex-none items-center justify-center rounded-lg border border-dashed text-xs text-slate-400">No photo</div>}
              <div className="min-w-0 text-sm">
                <p className="text-lg font-bold text-navy-900">{d.sections[0]?.rows[0]?.[1]}</p>
                <p className="mt-1 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize">{d.state.replace("_", " ")}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold">{d.category}</span>
                  {d.member && <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-emerald-800">{d.member.status || "member"}</span>}
                  {d.duplicates > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">{d.duplicates} possible duplicate(s)</span>}
                </p>
                <p className="mt-2 text-slate-600">Application {d.name} · applied {d.applied} ({d.source})</p>
                {d.approved && <p className="text-slate-600">Approved {d.approved}{d.approved_by && ` by ${d.approved_by}`}</p>}
                {d.member && <p className="text-slate-600">Member no. <b>{d.member.number}</b></p>}
              </div>
            </div>
            {d.membership && (
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <h3 className="mb-2 font-bold text-navy-900">Current membership</h3>
                <dl className="grid grid-cols-[8rem_1fr] gap-y-1">
                  {Object.entries(d.membership).map(([k, v]) => <div key={k} className="contents"><dt className="capitalize text-slate-500">{k.replace("_", " ")}</dt><dd>{v || "-"}</dd></div>)}
                </dl>
              </section>
            )}
            {d.terms && d.terms.length > 0 && (
              <section>
                <h3 className="mb-2 border-b pb-1 text-sm font-bold uppercase tracking-wide text-slate-500">Subscription history</h3>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="py-1">Type</th><th>From</th><th>To</th><th>By</th></tr></thead>
                  <tbody>{d.terms.map((t, i) => <tr key={i} className="border-t border-slate-100"><td className="py-1 capitalize">{t.kind}</td><td>{t.start}</td><td>{t.end}</td><td>{t.by || "-"}</td></tr>)}</tbody>
                </table>
              </section>
            )}
            {d.sections.map((s) => (
              <section key={s.title}>
                <h3 className="mb-2 border-b pb-1 text-sm font-bold uppercase tracking-wide text-slate-500">{s.title}</h3>
                <dl className="grid grid-cols-[9rem_1fr] gap-y-1.5 text-sm">
                  {s.rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="whitespace-pre-line break-words">{v || "-"}</dd></div>)}
                </dl>
              </section>
            ))}
            <p className="text-xs text-slate-500">Passport and Iqama numbers are masked here; open the record in Odoo to see them in full.</p>
            {children && <div className="flex flex-wrap gap-2 border-t pt-4">{children}</div>}
          </div>
        )}
      </aside>
    </div>
  );
}
