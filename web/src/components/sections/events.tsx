import { CalendarDays, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import { getContent, type SiteEvent } from "@/lib/content";
import { Section } from "./page-hero";

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(iso + "T00:00:00Z"));

export function dateLabel(e: Pick<SiteEvent, "date" | "endDate">) {
  const long: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return e.endDate && e.endDate !== e.date ? `${fmt(e.date, { day: "numeric", month: "short" })} – ${fmt(e.endDate, long)}` : fmt(e.date, long);
}

function EventCard({ e, upcoming, label }: { e: SiteEvent; upcoming: boolean; label: string }) {
  return (
    <li className="reveal lift flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <div className="relative aspect-[16/10] bg-navy-50">
        {e.image ? (
          <Image src={e.image} alt={e.title} fill sizes="(min-width:1024px) 380px, (min-width:640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-navy-900 to-navy-700 text-white/70">
            <CalendarDays className="size-12" aria-hidden />
          </div>
        )}
        <span className="absolute left-4 top-4 flex flex-col items-center rounded-2xl bg-white px-3.5 py-2 leading-none shadow-lg">
          <b className="text-2xl font-extrabold text-navy-900">{fmt(e.date, { day: "numeric" })}</b>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-saffron-700">{fmt(e.date, { month: "short" })}</span>
        </span>
        <span className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold ${upcoming ? "bg-emerald-700 text-white" : "bg-slate-800/80 text-white"}`}>
          {label}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="text-xl font-extrabold leading-snug text-navy-900">{e.title}</h3>
        <ul className="flex flex-col gap-1.5 text-sm text-slate-600">
          <li className="flex items-center gap-2"><CalendarDays className="size-4 flex-none text-saffron-700" aria-hidden />{dateLabel(e)}</li>
          {e.time && <li className="flex items-center gap-2"><Clock className="size-4 flex-none text-saffron-700" aria-hidden />{e.time}</li>}
          {(e.location || e.regionLabel) && (
            <li className="flex items-center gap-2"><MapPin className="size-4 flex-none text-saffron-700" aria-hidden />
              {[e.location, e.regionLabel].filter(Boolean).join(" · ")}</li>
          )}
        </ul>
        {e.details && <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{e.details}</p>}
      </div>
    </li>
  );
}

export async function Events({ limit = 6 }: { limit?: number }) {
  const c = await getContent();
  const today = new Date().toISOString().slice(0, 10);
  const events = c.events(today).slice(0, limit);
  return (
    <Section id="events">
      <div className="reveal mx-auto mb-12 max-w-2xl text-center">
        <span className="text-[13px] font-bold uppercase tracking-[2px] text-saffron-700">{c.t("home.events.eyebrow")}</span>
        <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.events.title")}</h2>
        <p className="mt-3 text-slate-600">{c.t("home.events.intro")}</p>
      </div>
      {events.length ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => {
            const upcoming = (e.endDate || e.date) >= today;
            return <EventCard key={`${e.date}-${e.title}`} e={e} upcoming={upcoming} label={c.t(upcoming ? "home.events.upcoming" : "home.events.past")} />;
          })}
        </ul>
      ) : (
        <p className="rounded-[24px] border border-dashed border-slate-300 bg-navy-50/50 px-6 py-12 text-center text-slate-600">{c.t("home.events.empty")}</p>
      )}
    </Section>
  );
}
