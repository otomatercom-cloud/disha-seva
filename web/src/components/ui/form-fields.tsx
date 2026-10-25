"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "block w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition " +
  "placeholder:text-slate-400 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30";

type Common = { label: string; error?: string; hint?: string; required?: boolean };

function Wrapper({ id, label, error, hint, required, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-navy-900">
        {label}
        {required && <span className="ml-0.5 text-red-700" aria-hidden="true">*</span>}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

export function TextField({ label, error, hint, required, className, ...props }: Common & ComponentProps<"input">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        aria-required={required}
        className={cn(control, error ? "border-red-500" : "border-slate-300", className)}
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label, error, hint, required, options, placeholder = "Select…", ...props
}: Common & ComponentProps<"select"> & { options: readonly (readonly [string, string])[]; placeholder?: string }) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, error ? "border-red-500" : "border-slate-300")}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
      </select>
    </Wrapper>
  );
}

export function TextAreaField({ label, error, hint, required, ...props }: Common & ComponentProps<"textarea">) {
  const id = useId();
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={!!error}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, error ? "border-red-500" : "border-slate-300")}
        {...props}
      />
    </Wrapper>
  );
}

export function CheckboxGroup({ legend, options, value, onChange, error, columns = 2 }: {
  legend: string;
  options: readonly (readonly [string, string])[];
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  columns?: 1 | 2;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-medium text-navy-900">
        {legend} <span className="font-normal text-slate-500">({value.length} selected)</span>
      </legend>
      <div className={cn("flex flex-wrap gap-2.5", columns === 1 && "flex-col items-stretch sm:flex-row")}>
        {options.map(([key, text]) => {
          const checked = value.includes(key);
          return (
            <label
              key={key}
              className={cn(
                "relative inline-flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-5 py-3 text-sm font-semibold transition",
                "hover:-translate-y-0.5 hover:border-navy-700 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-saffron-600",
                checked ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-slate-700",
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(checked ? value.filter((v) => v !== key) : [...value, key])}
                className="sr-only"
              />
              {checked && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12l5 5 10-10" />
                </svg>
              )}
              {text}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-700">{error}</p>}
    </fieldset>
  );
}
