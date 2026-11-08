"use client";

import { useState } from "react";

export function LoginForm() {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: f.get("login"), password: f.get("password") }),
    }).catch(() => null);
    setBusy(false);
    if (r?.ok) { window.location.href = "/admin"; return; }
    const d = await r?.json().catch(() => ({}));
    const M: Record<string, string> = {
      forbidden: "This user is not in the group \"Website Admin (Next.js /admin)\" in Odoo.",
      too_many: "Too many attempts. Try again in a few minutes.",
      invalid_credentials: "Wrong username or password.",
      not_configured: "Next.js is missing ODOO_BASE_URL or ODOO_API_TOKEN. Set them in the server .env and restart Next.js.",
      unreachable: "Next.js cannot reach Odoo. Check ODOO_BASE_URL (it must be reachable from the Next.js server, not only from your browser).",
      token_mismatch: "Odoo refused the server token. ODOO_API_TOKEN must equal the system parameter disha_membership.api_token.",
      module_missing: "Odoo has no admin API. Install or upgrade the module disha_admin_api (and check ODOO_DATABASE if Odoo has several databases).",
      odoo_error: "Odoo returned an error. Check the Odoo log.",
    };
    setErr(M[d?.error] ?? "Cannot reach the website server. Try again.");
  }

  const input = "mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-700/15";
  return (
    <form onSubmit={submit} className="w-full rounded-2xl bg-white p-8 shadow-xl">
      <h1 className="text-2xl">DISHA Website Admin</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in with your Odoo username and password.</p>
      <label className="mt-6 block text-sm font-medium">Username / email
        <input name="login" autoComplete="username" required className={input} /></label>
      <label className="mt-4 block text-sm font-medium">Password
        <input name="password" type="password" autoComplete="current-password" required className={input} /></label>
      {err && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      <button disabled={busy} className="mt-6 w-full rounded-full bg-saffron-700 px-6 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
