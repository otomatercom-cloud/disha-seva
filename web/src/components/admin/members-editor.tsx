"use client";

import { useCallback, useEffect, useState } from "react";
import { REGIONS } from "@/lib/validation/membership";
import { MemberDetail } from "./member-detail";
import { api, btnDanger, btnGhost, btnPrimary, errText, field } from "./api";

type Member = { id: number; application_id: number; number: string; name: string; category: string; status: string; region: string; city: string; mobile: string; email: string; approved: string; expiry: string };
const STATUSES = ["active", "suspended", "expired", "cancelled"];
const PAGE = 50;

export function MembersEditor() {
  const [rows, setRows] = useState<Member[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ status: "", region: "", category: "", expiring: "" });
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Member | null>(null);
  const [view, setView] = useState<Member | null>(null);
  const [tick, setTick] = useState(0);
  const [years, setYears] = useState("1");
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);
  const flash = (m: string, bad = false) => { setMsg({ m, bad }); window.setTimeout(() => setMsg(null), 4000); };

  const load = useCallback(async () => {
    const query: Record<string, string> = { limit: String(PAGE), offset: String(page * PAGE) };
    if (q.trim()) query.q = q.trim();
    for (const [k, v] of Object.entries(f)) if (v) query[k] = v;
    const r = await api<{ members: Member[]; total: number }>("members", { query });
    if (r.ok) { setRows(r.data.members); setTotal(r.data.total); setView((v) => (v ? r.data.members.find((x) => x.id === v.id) ?? v : v)); } else flash(errText(r), true);
  }, [q, f, page]);
  useEffect(() => { const t = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(t); }, [load]);

  async function act(m: Member, body: Record<string, unknown>, ok: string) {
    const r = await api("members", { body: { id: m.id, ...body } });
    flash(r.ok ? ok : errText(r), !r.ok);
    if (r.ok) { setEdit(null); setTick((n) => n + 1); void load(); }
  }
  function exportCsv() {
    if (!rows) return;
    const head = ["Member no", "Name", "Category", "Status", "Province", "City", "Mobile", "Email", "Approved", "Valid until"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [head, ...rows.map((r) => [r.number, r.name, r.category, r.status, r.region, r.city, r.mobile, r.email, r.approved, r.expiry])]
      .map((l) => l.map((v) => esc(/^[=+\-@]/.test(v) ? `'${v}` : v)).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + lines], { type: "text/csv" }));
    a.download = "disha-members.csv"; a.click(); URL.revokeObjectURL(a.href);
  }
  const sel = (k: keyof typeof f, label: string, opts: [string, string][]) => (
    <select aria-label={label} value={f[k]} onChange={(e) => { setPage(0); setF({ ...f, [k]: e.target.value }); }} className={field + " max-w-[11rem]"}>
      <option value="">{label}: all</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>);
  const tone = (s: string) => s === "active" ? "bg-emerald-100 text-emerald-800" : s === "suspended" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input aria-label="Search members" placeholder="Search name, member no, mobile, email" value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} className={field + " max-w-sm"} />
        {sel("status", "Status", STATUSES.map((s) => [s, s]))}
        {sel("region", "Province", REGIONS.map(([v, l]) => [v, l] as [string, string]))}
        {sel("category", "Category", [["general", "General"], ["associate", "Associate"]])}
        {sel("expiring", "Validity", [["30", "Expiring in 30 days"]])}
        <button className={btnGhost} onClick={exportCsv} disabled={!rows?.length}>Export CSV (this page)</button>
      </div>
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
      {!rows ? <p className="text-slate-500">Loading…</p> : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Member", "Category", "Province / city", "Contact", "Status", "Valid until", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
            <tbody>{rows.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2"><b>{m.name}</b><br /><span className="text-xs text-slate-500">{m.number}</span></td>
                <td className="px-3 py-2 capitalize">{m.category}</td>
                <td className="px-3 py-2 capitalize">{m.region} · {m.city}</td>
                <td className="px-3 py-2">{m.email}<br />{m.mobile}</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tone(m.status)}`}>{m.status || "-"}</span></td>
                <td className="px-3 py-2">{m.expiry || "-"}</td>
                <td className="px-3 py-2"><div className="flex flex-wrap gap-1.5">
                  <button className={btnGhost} onClick={() => setView(m)}>View</button>
                  <button className={btnGhost} onClick={() => setEdit(m)}>Edit contact</button>
                  <button className={btnGhost} onClick={() => confirm(`Email the ID card to ${m.email || "this member"}?`) && act(m, { op: "email_card" }, "ID card emailed")}>Resend card</button>
                </div></td>
              </tr>))}</tbody>
          </table>
          {!rows.length && <p className="p-6 text-slate-500">No members found.</p>}
        </div>)}
      <div className="mt-3 flex items-center gap-3 text-sm text-slate-600">
        <span>{total} member(s)</span>
        <button className={btnGhost} disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <button className={btnGhost} disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</button>
      </div>
      {view && (
        <MemberDetail appId={view.application_id} refresh={tick} onClose={() => setView(null)}>
          <div className="flex w-full flex-wrap items-center gap-2">
            <select aria-label="Renew for" value={years} onChange={(e) => setYears(e.target.value)} className={field + " max-w-[8rem]"}>
              {["1", "2", "3", "5"].map((y) => <option key={y} value={y}>{y} year{y === "1" ? "" : "s"}</option>)}</select>
            <button className={btnPrimary} disabled={view.status === "cancelled"} onClick={() => act(view, { op: "renew", years: Number(years) }, `Renewed for ${years} year(s)`)}>Renew</button>
            {view.status === "active" && <button className={btnGhost} onClick={() => confirm(`Suspend ${view.name}?`) && act(view, { op: "suspend" }, "Member suspended")}>Suspend</button>}
            {(view.status === "suspended" || view.status === "cancelled") && <button className={btnGhost} onClick={() => act(view, { op: "reactivate" }, "Member reactivated")}>Reactivate</button>}
            {view.status !== "cancelled" && <button className={btnDanger} onClick={() => confirm(`Cancel the membership of ${view.name}? The ID card stops being valid.`) && act(view, { op: "cancel" }, "Membership cancelled")}>Cancel membership</button>}
          </div>
          <button className={btnGhost} onClick={() => { setEdit(view); setView(null); }}>Edit contact</button>
          <button className={btnGhost} disabled={view.status === "cancelled"} onClick={() => confirm(`Email the ID card to ${view.email || "this member"}?`) && act(view, { op: "email_card" }, "ID card emailed")}>Resend card</button>
        </MemberDetail>
      )}
      {edit && <EditContact m={edit} onClose={() => setEdit(null)} onSave={(v) => act(edit, { op: "update_contact", ...v }, "Contact updated")} />}
    </div>
  );
}

function EditContact({ m, onClose, onSave }: { m: Member; onClose: () => void; onSave: (v: Record<string, string>) => void }) {
  const [v, setV] = useState({ mobile: m.mobile, email: m.email, region: m.region, ksa_city: m.city });
  const set = (k: string) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  return (
    <div role="dialog" aria-modal="true" aria-label={`Edit ${m.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-navy-900">Edit contact: {m.name}</h3>
        <label className="block text-xs font-semibold text-slate-600">Mobile<input className={field + " mt-1"} value={v.mobile} onChange={set("mobile")} maxLength={20} /></label>
        <label className="block text-xs font-semibold text-slate-600">Email<input className={field + " mt-1"} value={v.email} onChange={set("email")} maxLength={254} type="email" /></label>
        <label className="block text-xs font-semibold text-slate-600">Province
          <select className={field + " mt-1"} value={v.region} onChange={set("region")}>{REGIONS.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</select></label>
        <label className="block text-xs font-semibold text-slate-600">City<input className={field + " mt-1"} value={v.ksa_city} onChange={set("ksa_city")} maxLength={80} /></label>
        <div className="flex gap-2 pt-2">
          <button className={btnPrimary} onClick={() => onSave({ mobile: v.mobile, email: v.email, region: v.region, ksa_city: v.ksa_city })}>Save</button>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
