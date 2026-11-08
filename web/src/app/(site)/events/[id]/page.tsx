import { CalendarDays, Clock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CopyLink } from "@/components/admin/copy-link";
import { dateLabel } from "@/components/sections/events";
import { EventRegister, type RegLabels } from "@/components/sections/event-register";
import { PageHero, Section } from "@/components/sections/page-hero";
import { getContent } from "@/lib/content";

type P = { params: Promise<{ id: string }> };
const find = async (raw: string) => {
  const id = Number(raw);
  const c = await getContent();
  const e = Number.isInteger(id) && id > 0 ? c.events(new Date().toISOString().slice(0, 10)).find((x) => x.id === id) : undefined;
  return { c, e };
};

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { e } = await find((await params).id);
  return { title: e?.title ?? "Event", description: e?.details?.slice(0, 160) };
}

export default async function EventPage({ params }: P) {
  const { c, e } = await find((await params).id);
  if (!e) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (e.endDate || e.date) >= today;
  const reg = Object.fromEntries(
    ["button", "title", "intro", "name", "phone", "email", "region", "place", "submit", "success", "duplicate", "closed"].map((k) => [k, c.t(`events.reg.${k}`)]),
  ) as RegLabels;
  return (
    <>
      <PageHero title={e.title} intro={dateLabel(e)} />
      <Section>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_320px]">
          <div>
            {e.image && <div className="relative mb-6 aspect-[16/9] overflow-hidden rounded-2xl"><Image src={e.image} alt={e.title} fill sizes="(min-width:768px) 600px, 100vw" className="object-cover" priority /></div>}
            {e.details && <p className="whitespace-pre-line leading-relaxed text-slate-600">{e.details}</p>}
          </div>
          <aside className="h-fit rounded-2xl bg-white p-6 shadow-[0_14px_40px_rgba(15,61,46,.12)]">
            <ul className="flex flex-col gap-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CalendarDays className="size-4 text-saffron-700" aria-hidden />{dateLabel(e)}</li>
              {e.time && <li className="flex items-center gap-2"><Clock className="size-4 text-saffron-700" aria-hidden />{e.time}</li>}
              {(e.location || e.regionLabel) && <li className="flex items-center gap-2"><MapPin className="size-4 text-saffron-700" aria-hidden />{[e.location, e.regionLabel].filter(Boolean).join(" · ")}</li>}
            </ul>
            <div className="mt-5 flex flex-col gap-3">
              {upcoming && e.registration === "open" && <EventRegister eventId={e.id} eventTitle={e.title} labels={reg} />}
              {upcoming && e.registration === "full" && <p className="rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-600">{c.t("events.reg.full")}</p>}
              {(!upcoming || e.registration === "closed") && <p className="rounded-full bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-600">{reg.closed}</p>}
              <CopyLink path={`/events/${e.id}`} label="Copy link to share" />
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
