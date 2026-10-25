import type { Metadata } from "next";
import { SupportForm } from "@/components/forms/support-form";
import { ButtonLink } from "@/components/ui/button";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { title: c.t("nav.support"), description: c.t("support.intro") };
}

export default async function SupportPage() {
  const c = await getContent();
  const steps = c.items("support_steps");
  return (
    <>
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-16 sm:px-8">
          <span className="anim-up text-[13px] font-bold uppercase tracking-[2px] text-[#ff9a5c]">{c.t("support.eyebrow")}</span>
          <h1 className="anim-up delay-1 mt-3.5 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[54px]">{c.t("support.title")}</h1>
          <p className="anim-up delay-2 mt-4 max-w-xl text-lg leading-relaxed text-slate-300">{c.t("support.intro")}</p>
        </div>
      </section>
      <section className="bg-[#f4f5fc]">
        <div className="relative mx-auto -mt-16 flex max-w-7xl flex-wrap items-start gap-8 px-4 pb-24 sm:px-8">
          <div className="min-w-0 flex-[1_1_720px]"><SupportForm /></div>
          <aside className="flex min-w-0 max-w-md flex-[1_1_300px] flex-col gap-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-8">
              <b className="text-[19px] text-navy-900">{c.t("support.next.title")}</b>
              <ol className="mt-5 flex flex-col gap-5">
                {steps.map(({ title, text }, i) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex size-9 flex-none items-center justify-center rounded-full bg-seva-50 font-extrabold text-seva-700">{i + 1}</span>
                    <span className="flex flex-col gap-1"><b className="text-[15px] text-navy-900">{title}</b><span className="text-sm leading-relaxed">{text}</span></span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-[28px] bg-navy-900 p-8 text-slate-300">
              <b className="text-[19px] text-white">{c.t("support.track.title")}</b>
              <p className="mt-2.5 text-sm leading-relaxed">{c.t("support.track.text")}</p>
              <ButtonLink href="/support/track" variant="light" className="mt-4">{c.t("support.track.button")}</ButtonLink>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
