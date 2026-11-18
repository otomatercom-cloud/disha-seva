"use client";

import { useEffect, useState } from "react";
import { api, errText } from "./api";

type Dash = {
  applications: Record<string, number>;
  members: { total: number; by_status: Record<string, number>; expiring_30: number; expiring_60: number; expired: number; approved_without_member?: number };
  regions: { key: string; label: string; applications: number; members: number }[];
  categories: Record<string, { applications: number; members: number }>;
  monthly: { month: string; applied: number; approved: number }[];
};

function Tile({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const c = { slate: "text-navy-900", green: "text-emerald-700", amber: "text-amber-700", red: "text-red-700", blue: "text-sky-700" }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${c}`}>{value}</p>
    </div>
  );
}

function Bars({ rows }: { rows: { label: string; a: number; b: number }[] }) {
  const max = Math.max(1, ...rows.flatMap((r) => [r.a, r.b]));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="mb-1 flex justify-between"><span className="font-semibold capitalize">{r.label}</span><span className="text-slate-500">{r.b} members · {r.a} applications</span></div>
          <div className="h-2 rounded bg-slate-100"><div className="h-2 rounded bg-navy-700/30" style={{ width: `${(r.a / max) * 100}%` }} /></div>
          <div className="mt-1 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-600" style={{ width: `${(r.b / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function MembershipDashboard() {
  const [d, setD] = useState<Dash | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    void (async () => {
      const r = await api<Dash>("dashboard");
      if (r.ok) setD(r.data); else setErr(errText(r));
    })();
  }, []);
  if (err) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{err}</p>;
  if (!d) return <p className="p-6 text-slate-500">Loading…</p>;
  const a = d.applications, m = d.members, st = m.by_status;
  const maxM = Math.max(1, ...d.monthly.flatMap((x) => [x.applied, x.approved]));
  return (
    <div className="space-y-8">
      {(m.approved_without_member ?? 0) > 0 && (
        <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>{m.approved_without_member}</b> approved application(s) have no member record or ID card yet. Open <b>Membership applications</b> → status Approved → <b>Create member &amp; ID card</b>.
        </p>
      )}
      <section aria-label="Members">
        <h2 className="mb-3 text-lg font-bold text-navy-900">Members</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Tile label="Total members" value={m.total} />
          <Tile label="Active" value={st.active ?? 0} tone="green" />
          <Tile label="Suspended" value={st.suspended ?? 0} tone="amber" />
          <Tile label="Expired" value={m.expired} tone="red" />
          <Tile label="Expiring in 30 days" value={m.expiring_30} tone="amber" />
          <Tile label="Expiring in 60 days" value={m.expiring_60} tone="blue" />
        </div>
      </section>
      <section aria-label="Applications">
        <h2 className="mb-3 text-lg font-bold text-navy-900">Applications</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <Tile label="New" value={a.new ?? 0} tone="blue" />
          <Tile label="Under review" value={a.under_review ?? 0} tone="amber" />
          <Tile label="Contacted" value={a.contacted ?? 0} />
          <Tile label="Approved" value={a.approved ?? 0} tone="green" />
          <Tile label="Rejected" value={a.rejected ?? 0} tone="red" />
          <Tile label="Total" value={a.total ?? 0} />
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="By province">
          <h2 className="mb-4 text-lg font-bold text-navy-900">By province</h2>
          <Bars rows={d.regions.map((r) => ({ label: r.label, a: r.applications, b: r.members }))} />
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="By category">
          <h2 className="mb-4 text-lg font-bold text-navy-900">By category</h2>
          <Bars rows={Object.entries(d.categories).map(([k, v]) => ({ label: k, a: v.applications, b: v.members }))} />
          <p className="mt-4 text-xs text-slate-500">Green = members, grey = all applications.</p>
        </section>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-5" aria-label="Monthly trend">
        <h2 className="mb-4 text-lg font-bold text-navy-900">Last 12 months</h2>
        <div className="flex h-44 items-end gap-2">
          {d.monthly.map((x) => (
            <div key={x.month} className="flex flex-1 flex-col items-center gap-1" title={`${x.month}: ${x.applied} applied, ${x.approved} approved`}>
              <div className="flex h-36 w-full items-end justify-center gap-0.5">
                <div className="w-1/2 rounded-t bg-navy-700/40" style={{ height: `${(x.applied / maxM) * 100}%` }} />
                <div className="w-1/2 rounded-t bg-emerald-600" style={{ height: `${(x.approved / maxM) * 100}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">{x.month.slice(2)}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500"><span className="inline-block size-2 rounded bg-navy-700/40" /> Applied &nbsp; <span className="inline-block size-2 rounded bg-emerald-600" /> Approved</p>
      </section>
    </div>
  );
}
