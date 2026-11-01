"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { Alert } from "@/components/ui/alert";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form-fields";
import {
  BLOOD_GROUPS, CATEGORIES, GENDERS, REGIONS, membershipSchema, type MembershipApplication,
} from "@/lib/validation/membership";
import { PhotoField } from "@/components/ui/photo-field";
import type { SubmitResult } from "@/types/membership";

const defaults: MembershipApplication = {
  category: "general", full_name: "", gender: "", date_of_birth: "", nationality: "Indian", mobile: "", whatsapp: "",
  email: "", blood_group: "", qualification: "", occupation: "", organization: "", ksa_region: "", ksa_city: "",
  iqama_number: "", passport_number: "", india_state: "", india_district: "", india_village: "", india_pin: "",
  india_address: "", ksa_emergency_name: "", ksa_emergency_relationship: "", ksa_emergency_phone: "",
  india_emergency_name: "", india_emergency_relationship: "", india_emergency_phone: "", why_join: "",
  photo: "", consent: false as unknown as true,
};

const newKey = () => crypto.randomUUID();

const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  left: `${4 + i * 5.3}%`,
  color: ["#f26a0a", "#15803d", "#0c1b5e", "#ff9a5c", "#4ade80"][i % 5],
  delay: `${((i * 0.37) % 3).toFixed(2)}s`,
}));

function SectionCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="flex items-center gap-3 text-xl font-extrabold text-navy-900">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-navy-900 text-sm text-white" aria-hidden>{n}</span>
        {title}
      </legend>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function MembershipForm() {
  const {
    register, handleSubmit, control, setError, reset, formState: { errors, isSubmitting },
  } = useForm<MembershipApplication>({
    // zod preprocessors make the input type opaque; the output type is what the form edits.
    resolver: zodResolver(membershipSchema) as unknown as Resolver<MembershipApplication>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  // One key per attempt: a retry of the same submission can never create a second record.
  const idempotencyKey = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [reference, setReference] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const err = (name: keyof MembershipApplication) => errors[name]?.message as string | undefined;
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(values: MembershipApplication) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBanner(null);
    idempotencyKey.current ??= newKey();
    const honeypot = (document.getElementById("website") as HTMLInputElement | null)?.value ?? "";
    try {
      const res = await fetch("/api/membership-application", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const result = (await res.json().catch(() => null)) as SubmitResult | null;
      if (res.ok && result?.ok) {
        setReference(result.reference);
        idempotencyKey.current = null;
        reset(defaults);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (result && !result.ok && result.fields) {
        for (const [field, message] of Object.entries(result.fields)) {
          setError(field as keyof MembershipApplication, { message });
        }
        // The data changed server-side expectations: the next attempt is a new submission.
        idempotencyKey.current = null;
      }
      setBanner(result && !result.ok ? result.message : "Something went wrong and your application was not saved. Please try again.");
    } catch {
      setBanner("We could not reach the server. Your application was not saved. Please check your connection and try again.");
    } finally {
      inFlight.current = false;
    }
  }

  if (reference) {
    return (
      <Card className="relative mx-auto max-w-2xl overflow-hidden rounded-[2rem] text-center hover:translate-y-0 sm:p-14" role="status" aria-live="polite">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {CONFETTI.map((c, i) => (
            <span key={i} className="confetti" style={{ left: c.left, background: c.color, animationDelay: c.delay }} />
          ))}
        </div>
        <div className="relative mx-auto size-24">
          <span className="anim-ring absolute inset-0 rounded-full bg-seva-50" />
          <span className="anim-pop relative flex size-24 items-center justify-center rounded-full bg-seva-700 text-white">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path className="anim-tick" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        </div>
        <h2 className="anim-up delay-1 relative mt-8 text-4xl">Application received</h2>
        <p className="anim-up delay-2 relative mt-4 text-slate-600">
          Thank you for applying to DISHA. Your membership application has been received successfully. Keep your
          application number. Once DISHA approves your application, your digital membership ID card (PDF with QR) will be emailed to you.
        </p>
        <div className="anim-up delay-3 relative mx-auto mt-8 max-w-sm rounded-3xl border-2 border-dashed border-navy-700/30 bg-navy-50 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Your application number</p>
          <p data-testid="reference" className="mt-2 text-4xl font-extrabold tracking-wide text-navy-900">{reference}</p>
        </div>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" variant="secondary">Back to home</ButtonLink>
          <Button type="button" variant="ghost" onClick={() => setReference(null)}>Submit another application</Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_40px_70px_-40px_rgba(11,37,69,.35)] sm:p-11" aria-label="Membership application">
      <p className="text-sm text-slate-500"><span className="text-red-700">*</span> Required field</p>

      {banner && <Alert tone="error" title="Application not saved">{banner}</Alert>}

      <SectionCard n={1} title="Personal information">
        <SelectField label="Membership category" required options={CATEGORIES} error={err("category")} {...register("category")} />
        <TextField label="Full name (as in passport)" required autoComplete="name" error={err("full_name")} {...register("full_name")} />
        <SelectField label="Gender" required options={GENDERS} error={err("gender")} {...register("gender")} />
        <TextField label="Date of birth" required type="date" max={today} error={err("date_of_birth")} {...register("date_of_birth")} />
        <TextField label="Nationality" required error={err("nationality")} {...register("nationality")} />
        <TextField label="Mobile number" required type="tel" autoComplete="tel" placeholder="+966 5X XXX XXXX"
          hint="Include the country code" error={err("mobile")} {...register("mobile")} />
        <TextField label="WhatsApp number" type="tel" placeholder="+966 5X XXX XXXX" error={err("whatsapp")} {...register("whatsapp")} />
        <TextField label="Email address" required type="email" autoComplete="email" error={err("email")} {...register("email")} />
        <SelectField label="Blood group (optional)" options={BLOOD_GROUPS} error={err("blood_group")} {...register("blood_group")} />
        <TextField label="Educational qualification" error={err("qualification")} {...register("qualification")} />
        <TextField label="Profession / occupation" error={err("occupation")} {...register("occupation")} />
        <TextField label="Employer / organization" error={err("organization")} {...register("organization")} />
        <SelectField label="Province / region in KSA" required options={REGIONS} error={err("ksa_region")} {...register("ksa_region")} />
        <TextField label="City / area in KSA" required error={err("ksa_city")} {...register("ksa_city")} />
        <TextField label="Iqama number (if applicable)" error={err("iqama_number")} {...register("iqama_number")} />
        <TextField label="Passport number" required hint="Visible only to DISHA managers" error={err("passport_number")} {...register("passport_number")} />
        <Controller control={control} name="photo" render={({ field }) => (
          <PhotoField value={field.value} onChange={field.onChange} error={err("photo")} />
        )} />
      </SectionCard>

      <SectionCard n={2} title="Permanent address in India">
        <TextField label="State" required error={err("india_state")} {...register("india_state")} />
        <TextField label="District" required error={err("india_district")} {...register("india_district")} />
        <TextField label="Village / town" required error={err("india_village")} {...register("india_village")} />
        <TextField label="PIN code" required inputMode="numeric" maxLength={6} error={err("india_pin")} {...register("india_pin")} />
        <div className="sm:col-span-2">
          <TextAreaField label="Full address in India" required error={err("india_address")} {...register("india_address")} />
        </div>
      </SectionCard>

      <SectionCard n={3} title="Emergency contact details">
        <TextField label="Contact in KSA: name" required error={err("ksa_emergency_name")} {...register("ksa_emergency_name")} />
        <TextField label="Contact in KSA: relationship" required error={err("ksa_emergency_relationship")} {...register("ksa_emergency_relationship")} />
        <TextField label="Contact in KSA: mobile" required type="tel" placeholder="+966 5X XXX XXXX" error={err("ksa_emergency_phone")} {...register("ksa_emergency_phone")} />
        <div className="hidden sm:block" />
        <TextField label="Contact in India: name" required error={err("india_emergency_name")} {...register("india_emergency_name")} />
        <TextField label="Contact in India: relationship" required error={err("india_emergency_relationship")} {...register("india_emergency_relationship")} />
        <TextField label="Contact in India: mobile" required type="tel" placeholder="+91 XXXXX XXXXX" error={err("india_emergency_phone")} {...register("india_emergency_phone")} />
      </SectionCard>

      <fieldset className="min-w-0">
        <legend className="flex items-center gap-3 text-xl font-extrabold text-navy-900">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-navy-900 text-sm text-white" aria-hidden>4</span>
          Membership &amp; declaration
        </legend>
        <div className="mt-5 space-y-5">
          <TextAreaField label="Why would you like to join the organization? (optional)" error={err("why_join")} {...register("why_join")} />
          <div className="rounded-2xl bg-navy-50 p-6">
            <p className="text-sm leading-relaxed text-slate-700">
              I hereby declare that the information provided in this application is true and correct to the best of my
              knowledge. I agree to abide by the constitution, rules, code of conduct and decisions of the organization.
              I consent to the organization using my information for membership administration and official
              communication, subject to applicable laws and its privacy practices. See our{" "}
              <a href="/privacy-policy" className="font-medium text-navy-900 underline">Privacy Policy</a>.
            </p>
            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium text-navy-900">
              <input type="checkbox" className="mt-0.5 size-5 accent-[var(--color-navy-900)]" aria-required
                aria-invalid={!!errors.consent} {...register("consent")} />
              <span>I Agree <span className="text-red-700" aria-hidden>*</span><span className="sr-only">(required)</span></span>
            </label>
            {errors.consent && <p className="mt-2 text-xs font-medium text-red-700">{err("consent")}</p>}
          </div>
        </div>
      </fieldset>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="btn-lift anim-pulse min-w-52 px-9 py-4 text-base">
          {isSubmitting ? (<><Loader2 className="size-4 animate-spin" aria-hidden /> Submitting…</>) : "Submit application"}
        </Button>
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={() => { reset(defaults); setBanner(null); idempotencyKey.current = null; }}>
          Reset form
        </Button>
      </div>
    </form>
  );
}
