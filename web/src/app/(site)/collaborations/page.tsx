import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { Card } from "@/components/ui/card";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("nav.collab") };
}

export default async function CollaborationsPage() {
  const c = await getContent();
  const email = c.t("site.email");
  const subject = encodeURIComponent("Partnership enquiry");
  return (
    <>
      <PageHero title={c.t("collab.title")} intro={c.t("collab.intro")} />
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {c.items("collab_cards").map((k) => (
            <Card key={k.title}><h2 className="text-lg">{k.title}</h2><p className="mt-2 text-sm text-slate-600">{k.text}</p></Card>
          ))}
        </div>
        <div className="mx-auto mt-12 max-w-2xl rounded-2xl bg-navy-50 p-8 text-center">
          <h2 className="text-2xl">{c.t("collab.enquiry.title")}</h2>
          <p className="mt-2 text-slate-600">{c.t("collab.enquiry.text")}</p>
          <a href={`mailto:${email}?subject=${subject}`}
            className="mt-5 inline-block rounded-full bg-saffron-700 px-6 py-3 text-sm font-semibold text-white hover:bg-saffron-600">
            {c.t("collab.enquiry.button")} {email}
          </a>
        </div>
      </Section>
    </>
  );
}
