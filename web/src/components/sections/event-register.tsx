"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { btn } from "@/components/admin/api";

export type RegLabels = Record<"button" | "title" | "intro" | "name" | "phone" | "email" | "region" | "place" | "submit" | "success" | "duplicate" | "closed", string>;
const REGIONS: [string, string][] = [
  ["central", "Central Province"], ["western", "Western Province"], ["eastern", "Eastern Province"],
  ["northern", "Northern Province"], ["southern", "Southern Province"],
];
const input = "mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-700/15";

/** Register button + dialog form for one event. Posts to /api/event-registration. */
export function EventRegister({ eventId, eventTitle, labels }: { eventId: number; eventTitle: string; labels: RegLabels }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setErrors({}); setNotice("");
    const r = await fetch("/api/event-registration", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, ...Object.fromEntries(f) }),
    }).catch(() => null);
    setBusy(false);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && d.reference) { setDone(d.reference); return; }
    if (r?.status === 422 && d.fields) setErrors(d.fields);
    else if (d.error === "duplicate") setNotice(labels.duplicate);
    else if (d.error === "full" || d.error === "closed") setNotice(labels.closed);
    else if (r?.status === 429) setNotice("Too many attempts. Please try again in a few minutes.");
    else setNotice("Could not register right now. Please try again.");
  }
  const close = () => { ref.current?.close(); setDone(""); setNotice(""); setErrors({}); };
  const fld = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block text-sm font-medium text-slate-700">{label}
      <input name={name} required aria-invalid={!!errors[name]} className={input} {...props} />
      {errors[name] && <span role="alert" className="mt-1 block text-xs text-red-600">{errors[name]}</span>}
    </label>
  );

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}
        className={btn + "mt-auto w-full bg-saffron-700 py-2.5 text-white hover:bg-saffron-600 sm:w-auto"}>{labels.button}</button>
      <dialog ref={ref} aria-label={labels.title} onClose={close}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        className="m-auto w-[min(92vw,30rem)] rounded-3xl p-0 shadow-2xl backdrop:bg-navy-950/70">
        <div className="relative p-6 sm:p-8">
          <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-slate-100"><X className="size-5" aria-hidden /></button>
          <h3 className="pr-8 text-2xl text-navy-900">{labels.title}</h3>
          <p className="mt-1 text-sm font-semibold text-saffron-700">{eventTitle}</p>
          {done ? (
            <p role="status" className="mt-6 rounded-2xl bg-seva-50 p-5 text-seva-700">{labels.success} <b>{done}</b></p>
          ) : (
            <form onSubmit={submit} className="mt-5 grid gap-3.5" noValidate>
              <p className="text-sm text-slate-600">{labels.intro}</p>
              {fld("name", labels.name, { autoComplete: "name", maxLength: 120 })}
              {fld("phone", labels.phone, { type: "tel", autoComplete: "tel", maxLength: 20, inputMode: "tel" })}
              {fld("email", labels.email, { type: "email", autoComplete: "email", maxLength: 254 })}
              <label className="block text-sm font-medium text-slate-700">{labels.region}
                <select name="region" required defaultValue="" aria-invalid={!!errors.region} className={input}>
                  <option value="" disabled>—</option>{REGIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {errors.region && <span role="alert" className="mt-1 block text-xs text-red-600">{errors.region}</span>}
              </label>
              {fld("place", labels.place, { maxLength: 120, autoComplete: "address-level2" })}
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
              {notice && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{notice}</p>}
              <button disabled={busy} className={btn + "w-full bg-saffron-700 py-3 text-white hover:bg-saffron-600"}>{busy ? "…" : labels.submit}</button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
