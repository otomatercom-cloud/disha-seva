import { ArrowRight, Check, Mail, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { JoinButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getContent } from "@/lib/content";
import { VisionMission } from "./vision-mission";
import { HeroSlideshow } from "./hero-slideshow";
import { CountUp } from "./count-up";
import { PhotoGallery } from "./photo-gallery";
import { ReadMore } from "@/components/ui/read-more";
import { Section } from "./page-hero";

const Eyebrow = ({ children, tone = "saffron" }: { children: string; tone?: "saffron" | "green" | "light" }) => (
  <span className={`inline-flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[1.5px] before:h-0.5 before:w-8 before:bg-current ${tone === "green" ? "text-seva-700" : tone === "light" ? "text-saffron-500" : "text-saffron-700"}`}>
    {children}
  </span>
);

function DotGrid({ id }: { id: string }) {
  return (
    <svg aria-hidden className="absolute inset-0 size-full opacity-50">
      <defs><pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#2f8a6b" /></pattern></defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

function FloatCard({ className, icon, tone, title, text }: {
  className: string; icon: React.ReactNode; tone: string; title: string; text: string;
}) {
  return (
    <div className={`absolute flex items-center gap-3.5 rounded-[20px] bg-white px-5 py-4 shadow-[0_24px_40px_-16px_rgba(0,0,0,.45)] ${className}`}>
      <span className={`flex size-11 items-center justify-center rounded-[14px] ${tone}`}>{icon}</span>
      <span className="flex flex-col">
        <b className="text-[15px] text-navy-900">{title}</b>
        <span className="text-xs text-slate-500">{text}</span>
      </span>
    </div>
  );
}

export async function Hero() {
  const c = await getContent();
  const cards = c.items("hero_cards");
  const vm = [
    { label: c.t("about.vision.title"), text: c.t("about.vision.text") },
    { label: c.t("about.mission.title"), text: c.t("about.mission.text") },
  ].filter((x) => x.text);
  const slides = c.items("gallery").filter((g) => g.image).slice(0, 6).map((g) => ({ src: g.image, alt: g.title }));
  const tones = ["bg-saffron-50 text-saffron-700", "bg-seva-50 text-seva-700", "bg-navy-50 text-navy-900"];
  return (
    <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-navy-900 text-white">
      {slides.length > 0 ? <HeroSlideshow slides={slides} full /> : <DotGrid id="hero-dots" />}
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-10 px-4 pb-32 pt-16 sm:px-8">
        <div className="pointer-events-auto min-w-0 max-w-2xl flex-[1_1_520px]">
          <span className="anim-up inline-flex items-center gap-2.5 rounded-full bg-navy-700/80 px-4 py-2 text-[13px] font-semibold text-slate-200 backdrop-blur">
            <span className="size-2 rounded-full bg-saffron-500" /> {c.t("home.hero.badge")}
          </span>
          <h1 className="anim-up delay-1 mt-6 text-5xl font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-6xl lg:text-[68px]">
            {c.t("home.hero.title_main")} <span className="text-[#f58b1f]">{c.t("home.hero.title_accent")}</span>
          </h1>
          <p className="anim-up delay-2 mt-6 max-w-[540px] text-lg leading-relaxed text-slate-200 sm:text-xl">{c.t("home.hero.intro")}</p>
          <div className="anim-up delay-3 mt-9 flex flex-wrap gap-3.5">
            <Link href="/membership" className="btn-lift inline-flex items-center gap-2.5 rounded-full bg-saffron-600 px-8 py-4 text-base font-bold text-white hover:bg-saffron-700">
              {c.t("home.hero.cta1")} <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
            <Link href="/seva-activities" className="btn-lift inline-flex items-center rounded-full bg-white px-8 py-4 text-base font-bold text-navy-900">{c.t("home.hero.cta2")}</Link>
            <Link href="/about" className="btn-lift inline-flex items-center rounded-full border-2 border-white px-8 py-[14px] text-base font-bold text-white hover:bg-white hover:text-navy-900">{c.t("home.hero.cta3")}</Link>
          </div>
          <ul className="anim-up delay-4 mt-10 flex flex-wrap gap-x-7 gap-y-2 text-sm font-medium text-slate-200">
            {c.items("hero_checks").map((t) => (
              <li key={t.title} className="flex items-center gap-2"><Check className="size-[18px] text-green-400" aria-hidden />{t.title}</li>
            ))}
          </ul>
        </div>
        <div className="anim-up delay-3 flex min-w-0 flex-[0_1_400px] justify-end">
          <VisionMission items={vm} />
        </div>
      </div>
      <ul className="absolute inset-x-0 bottom-0 z-10 hidden border-t border-white/20 bg-white/10 backdrop-blur-md md:block">
        <li className="mx-auto grid max-w-7xl grid-cols-3 px-4 sm:px-8">
          {cards.slice(0, 3).map((k) => (
            <div key={k.title} className="border-r border-white/20 px-5 py-4 text-sm text-[#e4f1ea] last:border-0">
              <b className="font-display block text-[17px] text-saffron-500">{k.title}</b>{k.text}
            </div>
          ))}
        </li>
      </ul>
    </section>
  );
}

export async function Marquee() {
  const SERVICES = (await getContent()).items("services").map((i) => i.title);
  const items = [...SERVICES, ...SERVICES, ...SERVICES, ...SERVICES];
  return (
    <section aria-label="What we do" className="overflow-hidden bg-saffron-500">
      <div className="anim-marquee flex items-center py-5" aria-hidden>
        {items.map((label, i) => (
          <span key={i} className="font-display inline-flex items-center gap-8 whitespace-nowrap pl-8 text-2xl font-semibold text-white">
            {label}<span className="text-navy-900">✦</span>
          </span>
        ))}
      </div>
      <ul className="sr-only">{SERVICES.map((s) => <li key={s}>{s}</li>)}</ul>
    </section>
  );
}

export async function Intro() {
  const c = await getContent();
  const goals = c.items("goals").map((g) => g.title);
  const photo = c.img("home.intro.image");
  return (
    <Section>
      <div className="flex flex-wrap items-center gap-16 py-8">
        <div className="reveal relative h-[460px] min-w-0 flex-[1_1_440px]">
          <div className="absolute left-0 top-0 h-[82%] w-[78%] overflow-hidden rounded-[32px] bg-navy-900">
            {photo && <Image src={photo} alt={c.t("home.intro.image_alt")} fill sizes="(min-width:1024px) 40vw, 90vw" className="object-cover" />}
          </div>
          <div className="absolute bottom-0 right-0 flex h-[58%] w-[58%] items-center justify-center rounded-[32px] border-8 border-white bg-seva-50 text-seva-700">
            <Users className="size-20" strokeWidth={1.4} aria-hidden />
          </div>
          <div className="anim-float absolute bottom-[6%] left-[8%] rounded-2xl bg-saffron-600 px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_20px_36px_-14px_rgba(184,69,8,.6)]">
            {c.t("home.intro.badge")}
          </div>
        </div>
        <div className="reveal min-w-0 flex-[1_1_480px]">
          <Eyebrow>{c.t("home.intro.eyebrow")}</Eyebrow>
          <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.intro.title")}</h2>
          <p className="mt-5 text-lg leading-relaxed">
            {c.t("home.intro.body")}
          </p>
          <ul className="mt-7 flex flex-col gap-3.5">
            {goals.map((g) => (
              <li key={g} className="flex items-start gap-3.5">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-seva-50 text-seva-700"><Check className="size-4" strokeWidth={2.6} aria-hidden /></span>
                <span className="leading-relaxed text-slate-700">{g}</span>
              </li>
            ))}
          </ul>
          <Link href="/about" className="btn-lift mt-9 inline-flex rounded-full border-2 border-navy-900 px-7 py-3.5 text-[15px] font-bold text-navy-900 hover:bg-navy-900 hover:text-white">
            {c.t("home.intro.link")}
          </Link>
        </div>
      </div>
    </Section>
  );
}

export async function Pillars() {
  const c = await getContent();
  const items = c.items("pillars");
  return (
    <section className="bg-[#f5f8f6]">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <Eyebrow>{c.t("home.pillars.eyebrow")}</Eyebrow>
          <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.pillars.title")}</h2>
        </div>
        <div className="mt-14 grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <article key={p.title} className="lift reveal group relative overflow-hidden rounded-[18px] border border-[#e6eee9] bg-white p-8 shadow-[0_6px_24px_rgba(15,61,46,.08)] before:absolute before:bottom-0 before:left-0 before:h-1 before:w-0 before:bg-saffron-500 before:transition-all before:duration-500 hover:before:w-full">
              <span className="flex size-[68px] items-center justify-center rounded-full bg-navy-700/10 text-navy-700 transition duration-500 group-hover:bg-navy-700 group-hover:text-white"><Icon name={p.icon} className="size-7" /></span>
              <h3 className="mt-6 text-xl font-bold">{p.title}</h3>
              <ReadMore className="mt-2.5 text-[15px] leading-relaxed">{p.text}</ReadMore>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Impact() {
  const c = await getContent();
  const items = c.items("impact");
  return (
    <section className="relative overflow-hidden bg-navy-900 bg-[radial-gradient(circle_at_85%_20%,rgba(245,139,31,.18),transparent_45%)] text-white">
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-4 py-24 sm:px-8">
        <div className="reveal min-w-0 flex-[1_1_380px]">
          <Eyebrow tone="light">{c.t("home.impact.eyebrow")}</Eyebrow>
          <div className="font-display mt-3 text-[88px] font-bold leading-none text-saffron-500 sm:text-[120px]">
            <CountUp value={c.t("home.impact.number")} />{c.t("home.impact.suffix")}
          </div>
          <p className="mt-3 max-w-[420px] text-xl leading-relaxed text-slate-300">
            {c.t("home.impact.text")}
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-4">
          {items.map((i) => (
            <div key={i.title} className="lift reveal flex items-center gap-5 rounded-[18px] border border-white/15 bg-white/[0.07] px-7 py-6 hover:bg-white/[0.14]">
              <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-white/10 text-saffron-500"><Icon name={i.icon} className="size-6" /></span>
              <span className="flex flex-col gap-1">
                <b className="text-[19px] text-white">{i.title}</b>
                <span className="text-[15px] leading-normal text-slate-300">{i.text}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export async function OurMoments() {
  const c = await getContent();
  const photos = c.items("gallery").map((g) => ({ src: g.image, alt: g.title, year: g.year, category: g.category }));
  return (
    <Section tone="tint">
      <div className="reveal mx-auto mb-12 max-w-2xl text-center">
        <Eyebrow>{c.t("home.moments.eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.moments.title")}</h2>
        <p className="mt-3 text-slate-600">{c.t("home.moments.intro")}</p>
      </div>
      <PhotoGallery photos={photos} limit={6} showYears />
      <div className="mt-10 text-center">
        <Link href="/gallery" className="btn-lift inline-flex items-center gap-2 rounded-full border-2 border-navy-900 px-7 py-3.5 text-[15px] font-bold text-navy-900 hover:bg-navy-900 hover:text-white">
          {c.t("home.moments.link")} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Section>
  );
}

export async function JoinCta() {
  const c = await getContent();
  const tags = c.items("member_tags").map((t) => t.title);
  return (
    <section className="bg-[linear-gradient(110deg,rgba(15,61,46,.97),rgba(29,107,82,.9))] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-10 px-4 py-24 sm:px-8">
        <div className="reveal min-w-0 flex-[1_1_520px]">
          <Eyebrow tone="light">{c.t("home.join.eyebrow")}</Eyebrow>
          <h2 className="mt-3.5 text-white text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-[46px]">{c.t("home.join.title")}</h2>
          <p className="mt-4 max-w-[560px] text-lg leading-relaxed text-[#d8ece3]">
            {c.t("home.join.body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/membership" className="btn-lift anim-pulse inline-flex items-center gap-2.5 rounded-full bg-saffron-700 px-8 py-4 text-base font-bold text-white">
              {c.t("site.join")} <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
            <span className="text-sm font-semibold text-[#d8ece3]">{c.t("home.join.note")}</span>
          </div>
        </div>
        <ul className="reveal flex min-w-0 flex-[1_1_380px] flex-wrap gap-3">
          {tags.map((t) => (
            <li key={t} className="lift rounded-full border border-white/25 bg-white/12 px-5 py-2.5 text-sm text-white hover:border-saffron-500 hover:bg-saffron-600">{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export async function CollabAndReports() {
  const c = await getContent();
  const reports = c.items("reports").slice(0, 3);
  return (
    <Section>
      <div className="reveal flex flex-wrap gap-6">
        <div className="min-w-0 flex-[1_1_560px] rounded-[18px] bg-navy-900 p-8 text-white shadow-[0_14px_40px_rgba(15,61,46,.12)] sm:p-12">
          <Eyebrow tone="light">{c.t("home.collab.eyebrow")}</Eyebrow>
          <h3 className="mt-3.5 text-3xl font-extrabold leading-tight text-white">{c.t("home.collab.title")}</h3>
          <p className="mt-4 leading-relaxed text-slate-300">
            {c.t("home.collab.body")}
          </p>
          <Link href="/collaborations" className="btn-lift mt-7 inline-flex rounded-full bg-white px-7 py-3.5 text-[15px] font-bold text-navy-900">{c.t("home.collab.cta")}</Link>
        </div>
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
          <Eyebrow>{c.t("home.reports.eyebrow")}</Eyebrow>
          {reports.map(({ title, text }) => (
            <Link key={title} href="/reports" className="lift flex items-center justify-between gap-4 rounded-[18px] border-l-[5px] border-saffron-500 bg-white px-6 py-5 shadow-[0_6px_24px_rgba(15,61,46,.08)]">
              <span className="flex flex-col gap-1"><b className="text-lg text-navy-900">{title}</b><span className="text-sm leading-normal">{text}</span></span>
              <ArrowRight className="size-[22px] flex-none text-saffron-700" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </Section>
  );
}

export async function ContactStrip() {
  const c = await getContent();
  const email = c.t("site.email");
  return (
    <Section tone="tint" title={c.t("home.contact.title")}>
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-saffron-700/10 text-saffron-700"><MapPin className="size-5" aria-hidden /></span>
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{c.t("site.address")}</p>
              <p className="mt-0.5 text-sm text-slate-600">{c.t("site.hours")}</p>
            </div>
          </div>
          <a href={`mailto:${email}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md">
            <span className="flex size-10 flex-none items-center justify-center rounded-full bg-saffron-700/10 text-saffron-700"><Mail className="size-5" aria-hidden /></span>
            <div className="min-w-0">
              <p className="break-all font-semibold text-navy-900">{email}</p>
              <p className="mt-0.5 text-sm text-slate-600">Email us</p>
            </div>
          </a>
        </div>
        <div className="mt-6 flex justify-center">
          <JoinButton label={c.t("site.join")} />
        </div>
      </div>
    </Section>
  );
}
