import { ArrowRight, Check, Mail, MapPin, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { JoinButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getContent } from "@/lib/content";
import { HeroSlideshow } from "./hero-slideshow";
import { PhotoGallery } from "./photo-gallery";
import { Section } from "./page-hero";

const Eyebrow = ({ children, tone = "saffron" }: { children: string; tone?: "saffron" | "green" | "light" }) => (
  <span className={`text-[13px] font-bold uppercase tracking-[2px] ${tone === "green" ? "text-seva-700" : tone === "light" ? "text-[#ff9a5c]" : "text-saffron-700"}`}>
    {children}
  </span>
);

function DotGrid({ id }: { id: string }) {
  return (
    <svg aria-hidden className="absolute inset-0 size-full opacity-50">
      <defs><pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill="#27368f" /></pattern></defs>
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
  const slides = c.items("gallery").filter((g) => g.image).slice(0, 6).map((g) => ({ src: g.image, alt: g.title }));
  const floats = ["anim-float left-0 top-[7%]", "anim-float-2 right-0 top-[42%]", "anim-float-3 -bottom-[5%] left-[6%]"];
  const tones = ["bg-saffron-50 text-saffron-700", "bg-seva-50 text-seva-700", "bg-navy-50 text-navy-900"];
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <DotGrid id="hero-dots" />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-14 px-4 pb-24 pt-16 sm:px-8 lg:pt-24">
        <div className="min-w-0 flex-[1_1_520px]">
          <span className="anim-up inline-flex items-center gap-2.5 rounded-full bg-navy-700 px-4 py-2 text-[13px] font-semibold text-slate-200">
            <span className="size-2 rounded-full bg-green-400" /> {c.t("home.hero.badge")}
          </span>
          <h1 className="anim-up delay-1 mt-6 text-5xl font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-6xl lg:text-[68px]">
            {c.t("home.hero.title_main")} <span className="text-[#ff9a5c]">{c.t("home.hero.title_accent")}</span>
          </h1>
          <p className="anim-up delay-2 mt-6 max-w-[540px] text-lg leading-relaxed text-slate-300 sm:text-xl">
            {c.t("home.hero.intro")}
          </p>
          <div className="anim-up delay-3 mt-9 flex flex-wrap gap-3.5">
            <Link href="/membership" className="btn-lift anim-pulse inline-flex items-center gap-2.5 rounded-full bg-saffron-600 px-8 py-4 text-base font-bold text-white">
              {c.t("home.hero.cta1")} <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
            <Link href="/seva-activities" className="btn-lift inline-flex items-center rounded-full bg-white px-8 py-4 text-base font-bold text-navy-900">
              {c.t("home.hero.cta2")}
            </Link>
          </div>
          <ul className="anim-up delay-4 mt-11 flex flex-wrap gap-7 text-sm font-medium text-slate-300">
            {c.items("hero_checks").map((t) => (
              <li key={t.title} className="flex items-center gap-2"><Check className="size-[18px] text-green-400" aria-hidden />{t.title}</li>
            ))}
          </ul>
        </div>

        <div className="anim-up delay-2 relative h-[540px] min-w-0 max-w-[560px] flex-[1_1_440px]">
          <svg aria-hidden viewBox="0 0 520 520" className="anim-spin absolute inset-0 size-full">
            <circle cx="260" cy="260" r="240" fill="none" stroke="#2a5088" strokeWidth="1.5" strokeDasharray="4 10" />
            <circle cx="260" cy="20" r="9" fill="#ff9a5c" /><circle cx="500" cy="260" r="6" fill="#4ade80" />
          </svg>
          <div className="absolute left-[12%] top-[11%] h-[78%] w-[76%]">
            {slides.length > 0 ? <HeroSlideshow slides={slides} /> : (
              <div className="size-full overflow-hidden rounded-[36px] bg-navy-700 shadow-[0_40px_80px_-30px_rgba(0,0,0,.6)]">
            <svg aria-hidden viewBox="0 0 400 420" className="size-full">
              <path className="anim-draw" d="M-10 330 C80 260 140 360 220 280 S340 200 420 250" fill="none" stroke="#ff9a5c" strokeWidth="3" strokeLinecap="round" />
              <path className="anim-draw" d="M-10 370 C90 310 150 400 230 330 S350 260 420 300" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" opacity=".8" />
              <circle cx="200" cy="130" r="64" fill="#0c1b5e" /><circle cx="200" cy="130" r="64" fill="none" stroke="#2a5088" strokeWidth="2" />
              <path d="M200 100 c-14 -20 -42 -8 -36 14 c4 16 24 28 36 40 c12 -12 32 -24 36 -40 c6 -22 -22 -34 -36 -14z" fill="#d24e0a" />
            </svg>
              </div>
            )}
          </div>
          {cards.slice(0, 3).map((k, i) => (
            <FloatCard key={k.title} className={floats[i]} tone={tones[i]} icon={<Icon name={k.icon} className="size-[22px]" />}
              title={k.title} text={k.text} />
          ))}
        </div>
      </div>
    </section>
  );
}

export async function Marquee() {
  const SERVICES = (await getContent()).items("services").map((i) => i.title);
  const items = [...SERVICES, ...SERVICES, ...SERVICES, ...SERVICES];
  return (
    <section aria-label="What we do" className="overflow-hidden border-b border-[#dbe5f2] bg-navy-50">
      <div className="anim-marquee flex items-center py-5" aria-hidden>
        {items.map((label, i) => (
          <span key={i} className="inline-flex items-center gap-3 whitespace-nowrap px-7 text-base font-bold text-navy-900">
            <span className="size-2 rounded-full bg-saffron-600" />{label}
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
    <section className="bg-[#f4f5fc]">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-8">
        <div className="reveal mx-auto max-w-2xl text-center">
          <Eyebrow>{c.t("home.pillars.eyebrow")}</Eyebrow>
          <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.pillars.title")}</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => (
            <article key={p.title} className="lift reveal rounded-[28px] border border-slate-200 bg-white p-8">
              <span className="flex size-[60px] items-center justify-center rounded-[18px] bg-navy-50 text-navy-900"><Icon name={p.icon} className="size-7" /></span>
              <h3 className="mt-6 text-xl font-bold">{p.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed">{p.text}</p>
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
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <DotGrid id="impact-dots" />
      <div className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-4 py-24 sm:px-8">
        <div className="reveal min-w-0 flex-[1_1_380px]">
          <Eyebrow tone="light">{c.t("home.impact.eyebrow")}</Eyebrow>
          <div className="mt-3 text-[96px] font-extrabold leading-none tracking-[-0.04em] text-white sm:text-[128px]">
            {c.t("home.impact.number")}<span className="text-[#ff9a5c]">{c.t("home.impact.suffix")}</span>
          </div>
          <p className="mt-3 max-w-[420px] text-xl leading-relaxed text-slate-300">
            {c.t("home.impact.text")}
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-4">
          {items.map((i) => (
            <div key={i.title} className="lift reveal flex items-center gap-5 rounded-3xl border border-navy-700 bg-[#12315c] px-7 py-6">
              <span className="flex size-14 flex-none items-center justify-center rounded-2xl bg-navy-700 text-green-400"><Icon name={i.icon} className="size-6" /></span>
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
  const photos = c.items("gallery").map((g) => ({ src: g.image, alt: g.title }));
  return (
    <Section tone="tint">
      <div className="reveal mx-auto mb-12 max-w-2xl text-center">
        <Eyebrow>{c.t("home.moments.eyebrow")}</Eyebrow>
        <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-[44px]">{c.t("home.moments.title")}</h2>
        <p className="mt-3 text-slate-600">{c.t("home.moments.intro")}</p>
      </div>
      <PhotoGallery photos={photos} limit={6} />
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
    <section className="bg-seva-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-10 px-4 py-24 sm:px-8">
        <div className="reveal min-w-0 flex-[1_1_520px]">
          <Eyebrow tone="green">{c.t("home.join.eyebrow")}</Eyebrow>
          <h2 className="mt-3.5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-[46px]">{c.t("home.join.title")}</h2>
          <p className="mt-4 max-w-[560px] text-lg leading-relaxed text-slate-700">
            {c.t("home.join.body")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link href="/membership" className="btn-lift anim-pulse inline-flex items-center gap-2.5 rounded-full bg-saffron-700 px-8 py-4 text-base font-bold text-white">
              {c.t("site.join")} <ArrowRight className="size-[18px]" aria-hidden />
            </Link>
            <span className="text-sm font-semibold text-seva-700">{c.t("home.join.note")}</span>
          </div>
        </div>
        <ul className="reveal flex min-w-0 flex-[1_1_380px] flex-wrap gap-3">
          {tags.map((t) => (
            <li key={t} className="lift rounded-full border border-[#bfe3cb] bg-white px-5 py-3 text-sm font-semibold text-[#14532d]">{t}</li>
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
        <div className="min-w-0 flex-[1_1_560px] rounded-[32px] bg-navy-900 p-8 text-white sm:p-12">
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
            <Link key={title} href="/reports" className="lift flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-white px-6 py-5">
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
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <p className="flex items-center gap-2 text-slate-600"><MapPin className="size-4" aria-hidden /> {c.t("site.address")} · {c.t("site.hours")}</p>
        <a href={`mailto:${email}`} className="inline-flex items-center gap-2 text-lg font-semibold text-navy-900 hover:underline">
          <Mail className="size-5" aria-hidden /> {email}
        </a>
        <JoinButton className="mt-3" label={c.t("site.join")} />
      </div>
    </Section>
  );
}
