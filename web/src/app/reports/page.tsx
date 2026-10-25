import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { Card } from "@/components/ui/card";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("nav.reports") };
}

export default async function ReportsPage() {
  const c = await getContent();
  return (
    <>
      <PageHero title={c.t("reports.title")} intro={c.t("reports.intro")} />
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          {c.items("reports").map((r) => (
            <Card key={r.title}>
              <h2 className="text-xl">{r.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{r.text}</p>
              {r.file && (
                <a href={r.file} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-navy-900 underline">
                  {c.t("reports.download")}
                </a>
              )}
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
