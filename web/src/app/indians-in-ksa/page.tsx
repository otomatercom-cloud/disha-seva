import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { JoinButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("nav.indians") };
}

export default async function IndiansInKsaPage() {
  const c = await getContent();
  return (
    <>
      <PageHero title={c.t("indians.title")} intro={c.t("indians.intro")} />
      <Section title={c.t("indians.helps.title")}>
        <div className="grid gap-6 md:grid-cols-2">
          {c.items("helps").map((h) => (
            <Card key={h.title}><h3 className="text-lg">{h.title}</h3><p className="mt-2 text-sm text-slate-600">{h.text}</p></Card>
          ))}
        </div>
      </Section>
      <Section tone="tint" title={c.t("indians.faq.title")}>
        <dl className="mx-auto max-w-3xl space-y-4">
          {c.items("faq").map((f) => (
            <Card key={f.title}><dt className="font-semibold text-navy-900">{f.title}</dt><dd className="mt-1 text-sm text-slate-600">{f.text}</dd></Card>
          ))}
        </dl>
        <p className="mx-auto mt-6 max-w-3xl text-xs text-slate-500">{c.t("indians.faq.note")}</p>
        <div className="mt-8 text-center"><JoinButton label={c.t("site.join")} /></div>
      </Section>
    </>
  );
}
