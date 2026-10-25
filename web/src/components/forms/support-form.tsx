"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, ShieldAlert } from "lucide-react";
import { useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form-fields";
import { CATEGORIES, supportTicketSchema, URGENCY, type SupportTicket } from "@/lib/validation/support-ticket";

const defaults = {
  requester_name: "", email: "", mobile: "", city: "", category: "", urgency: "normal",
  subject: "", description: "", consent: false,
} as unknown as SupportTicket;

const newKey = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/-/g, "").padEnd(24, "0");

type Created = { reference: string; token: string | null; priority: string | null };

export function SupportForm({ trackHref = "/support/track" }: { trackHref?: string }) {
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm<SupportTicket>({
    resolver: zodResolver(supportTicketSchema) as unknown as Resolver<SupportTicket>,
    defaultValues: defaults,
  });
  const key = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const err = (n: keyof SupportTicket) => errors[n]?.message as string | undefined;

  async function onSubmit(values: SupportTicket) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBanner(null);
    key.current ??= newKey();
    const honeypot = (document.getElementById("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/support-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": key.current },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setCreated({ reference: data.reference, token: data.token, priority: data.priority });
        key.current = null;
        reset(defaults);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (data?.fields) {
        for (const [f, message] of Object.entries(data.fields as Record<string, string>)) setError(f as keyof SupportTicket, { message });
        key.current = null;
      }
      setBanner(data?.message ?? "Something went wrong and your request was not saved. Please try again.");
    } catch {
      setBanner("We could not reach the server. Your request was not saved. Please check your connection and try again.");
    } finally {
      inFlight.current = false;
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the token is visible to copy by hand */ }
  }

  if (created) {
    return (
      <Card className="relative overflow-hidden p-8 text-center sm:p-12" role="status" aria-live="polite">
        <h2 className="text-3xl">Your request has been received</h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          Our team will review it{created.priority ? ` (priority: ${created.priority})` : ""} and update you.
          Reference <b data-testid="reference">{created.reference}</b>.
        </p>
        {created.token ? (
          <div className="mx-auto mt-8 max-w-md rounded-3xl border-2 border-dashed border-navy-700/30 bg-navy-50 p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your private tracking token</p>
            <p data-testid="token" className="mt-2 select-all font-mono text-3xl font-extrabold tracking-wider text-navy-900">{created.token}</p>
            <Button type="button" variant="secondary" className="mt-4" onClick={() => copy(created.token!)}>
              {copied ? <><Check className="size-4" aria-hidden /> Copied</> : <><Copy className="size-4" aria-hidden /> Copy token</>}
            </Button>
          </div>
        ) : (
          <Alert tone="info" className="mx-auto mt-8 max-w-md">This request was already submitted. Use the token shown when you first sent it.</Alert>
        )}
        <Alert tone="error" className="mx-auto mt-6 max-w-md text-left">
          <span className="flex gap-2"><ShieldAlert className="mt-0.5 size-4 flex-none" aria-hidden />
            <span><b>Save this token now.</b> It is shown only once and we cannot show it again. Anyone with the token can see this request, so keep it private.</span></span>
        </Alert>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href={trackHref}>Track my request</ButtonLink>
          <Button type="button" variant="ghost" onClick={() => setCreated(null)}>Submit another request</Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Support request"
      className="space-y-8 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_40px_70px_-40px_rgba(11,37,69,.35)] sm:p-10">
      <p className="text-sm text-slate-500"><span className="text-red-700">*</span> Required field</p>
      {banner && <Alert tone="error" title="Request not saved">{banner}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField label="What do you need help with?" required options={CATEGORIES} placeholder="Choose a category" error={err("category")} {...register("category")} />
        <SelectField label="How urgent is it?" required options={URGENCY} placeholder="Choose urgency" error={err("urgency")} {...register("urgency")} />
        <div className="sm:col-span-2"><TextField label="Short title" required placeholder="e.g. Exit re-entry visa expired" error={err("subject")} {...register("subject")} /></div>
        <div className="sm:col-span-2"><TextAreaField label="Describe the problem" required rows={6} hint="Include dates, document numbers you are comfortable sharing, and what help you need." error={err("description")} {...register("description")} /></div>
        <TextField label="Your name" required autoComplete="name" error={err("requester_name")} {...register("requester_name")} />
        <TextField label="Mobile / WhatsApp" required type="tel" placeholder="+966 5X XXX XXXX" autoComplete="tel" error={err("mobile")} {...register("mobile")} />
        <TextField label="Email" required type="email" autoComplete="email" error={err("email")} {...register("email")} />
        <TextField label="City" autoComplete="address-level2" error={err("city")} {...register("city")} />
      </div>
      <div className="rounded-2xl bg-navy-50 p-5">
        <label className="flex cursor-pointer items-start gap-3 text-sm font-medium text-navy-900">
          <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-navy-900)]" aria-required aria-invalid={!!errors.consent} {...register("consent")} />
          <span>I confirm the details are correct and DISHA may contact me about this request. <span className="text-red-700" aria-hidden>*</span><span className="sr-only">(required)</span>
            <span className="mt-1 block font-normal text-slate-600">See our <a href="/privacy-policy" className="underline">Privacy Policy</a>.</span></span>
        </label>
        {errors.consent && <p className="mt-2 text-xs font-medium text-red-700">{err("consent")}</p>}
      </div>
      <p className="text-xs text-slate-500">In danger or need an ambulance? Call local emergency services (<b>911</b> in Saudi Arabia) first, then contact us.</p>
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="btn-lift min-w-52 px-9 py-4 text-base">
        {isSubmitting ? (<><Loader2 className="size-4 animate-spin" aria-hidden /> Submitting…</>) : "Submit request"}
      </Button>
    </form>
  );
}
