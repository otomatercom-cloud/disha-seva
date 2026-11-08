"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, btnDanger, btnGhost, btnPrimary, errText, field, fileToB64 } from "./api";

type Text = { id: number; key: string; page: string; label: string; kind: "line" | "text" | "long" | "image"; value: string; default: string; changed: boolean; image: string };
export type TextsMode = "content" | "menu" | "theme";
const MENU = "Menu & footer";
const SITE = "Site-wide";
const THEME = "Theme & colours";

function Row({ t, onSaved, flash }: { t: Text; onSaved: () => void; flash: (m: string, bad?: boolean) => void }) {
  const [v, setV] = useState(t.value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setV(t.value), [t.value]);
  const dirty = v !== t.value;
  const isToggle = t.key.startsWith("navshow.");
  const isColor = t.key.startsWith("theme.");

  async function run(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    const r = await api("texts", { body: { id: t.id, ...body } });
    setBusy(false);
    if (r.ok) { flash(ok); onSaved(); } else flash(errText(r), true);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor={`t${t.id}`}>{t.label}</label>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          {(t.changed || t.image) && <span className="rounded bg-saffron-50 px-2 py-0.5 text-saffron-700">edited</span>}<code>{t.key}</code>
        </span>
      </div>
      {t.kind === "image" ? (
        <div className="flex flex-wrap items-center gap-4">
          {t.image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={t.image} alt="" className="h-20 max-w-[200px] rounded-lg border bg-slate-50 object-contain" />
            : <span className="text-sm text-slate-500">Using the built-in default image.</span>}
          <label className={btnGhost + "cursor-pointer"}>{busy ? "Uploading…" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy}
              onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await run({ op: "image", image_b64: await fileToB64(f) }, "Image saved"); }} />
          </label>
          {t.image && <button className={btnDanger} disabled={busy} onClick={() => run({ op: "clear_image" }, "Back to default image")}>Remove</button>}
        </div>
      ) : isToggle ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" id={`t${t.id}`} checked={v.trim().toLowerCase() !== "no"} disabled={busy}
            onChange={(e) => run({ op: "save", value: e.target.checked ? "yes" : "no" }, "Saved")} /> Show on the website
        </label>
      ) : (
        <>
          {isColor ? (
            <div className="flex items-center gap-3">
              <input type="color" aria-label={t.label} value={/^#[0-9a-f]{6}$/i.test(v) ? v : "#000000"} onChange={(e) => setV(e.target.value)} className="size-10 cursor-pointer rounded border" />
              <input id={`t${t.id}`} value={v} onChange={(e) => setV(e.target.value)} className={field + " max-w-[140px] font-mono"} maxLength={7} />
            </div>
          ) : t.kind === "line" ? (
            <input id={`t${t.id}`} value={v} onChange={(e) => setV(e.target.value)} className={field} />
          ) : (
            <textarea id={`t${t.id}`} value={v} onChange={(e) => setV(e.target.value)} rows={t.kind === "long" ? 14 : 3} className={field} />
          )}
          <div className="mt-3 flex gap-2">
            <button className={btnPrimary} disabled={!dirty || busy} onClick={() => run({ op: "save", value: v }, "Saved")}>{busy ? "Saving…" : "Save"}</button>
            {(t.changed || dirty) && <button className={btnGhost} disabled={busy} onClick={() => (dirty ? setV(t.value) : run({ op: "reset" }, "Reset to default"))}>{dirty ? "Undo" : "Reset to default"}</button>}
          </div>
        </>
      )}
    </div>
  );
}

export function TextsEditor({ mode }: { mode: TextsMode }) {
  const [texts, setTexts] = useState<Text[] | null>(null);
  const [page, setPage] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ m: string; bad: boolean } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ texts: Text[] }>("texts");
    if (r.ok) setTexts(r.data.texts); else setMsg({ m: errText(r), bad: true });
  }, []);
  useEffect(() => { void load(); }, [load]);
  const flash = (m: string, bad = false) => { setMsg({ m, bad }); window.setTimeout(() => setMsg(null), 3500); };

  const inMode = useMemo(() => (texts ?? []).filter((t) => (mode === "menu" ? t.page === MENU || t.page === SITE : mode === "theme" ? t.page === THEME : t.page !== MENU && t.page !== THEME && t.page !== SITE)), [texts, mode]);
  const pages = useMemo(() => [...new Set(inMode.map((t) => t.page))], [inMode]);
  const shown = inMode.filter((t) => (mode !== "content" || q || !page || t.page === page) && (!q || (t.label + t.key + t.value).toLowerCase().includes(q.toLowerCase())));

  if (!texts) return <p className="p-6 text-slate-500">{msg?.m ?? "Loading…"}</p>;
  return (
    <div>
      {mode === "content" && (
        <div className="mb-5 flex flex-wrap gap-3">
          <select aria-label="Page" value={page} onChange={(e) => setPage(e.target.value)} className={field + " max-w-xs"}>
            <option value="">All pages</option>{pages.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input aria-label="Search" placeholder="Search text…" value={q} onChange={(e) => setQ(e.target.value)} className={field + " max-w-xs"} />
        </div>
      )}
      {mode === "theme" && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4">
          {inMode.map((t) => <span key={t.id} className="size-8 rounded-full border" style={{ background: /^#[0-9a-f]{6}$/i.test(t.value) ? t.value : t.default }} title={t.label} />)}
          <span className="text-sm text-slate-500">Changes appear on the public site within seconds. Use dark colours for buttons: white text sits on them.</span>
        </div>
      )}
      {msg && <p role="status" className={`fixed bottom-5 right-5 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${msg.bad ? "bg-red-600" : "bg-navy-700"}`}>{msg.m}</p>}
      <div className="grid gap-3">{shown.map((t) => <Row key={t.id} t={t} onSaved={load} flash={flash} />)}</div>
      {!shown.length && <p className="text-slate-500">Nothing matches.</p>}
    </div>
  );
}
