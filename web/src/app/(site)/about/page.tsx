import type { Metadata } from "next";
import { PageHero, Prose, Section } from "@/components/sections/page-hero";
import { JoinButton } from "@/components/ui/button";
import { Card, FeatureCard } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { RichText } from "@/components/ui/rich-text";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("nav.about") };
}

export default async function AboutPage() {
  const c = await getContent();
  const i = "size-6";
  const stats = c.items("stats");
  return (
    <>
      <PageHero title={c.t("about.title")} intro={c.t("about.intro")} />
      {c.t("about.article") && c.show("about.show.article") && (
        <Prose><RichText source={c.t("about.article")} email={c.t("site.email")} /></Prose>
      )}
      <Section>
        {c.show("about.show.formation") && <Card>
          <h2 className="text-2xl">{c.t("about.formation.title")}</h2>
          <p className="mt-3 leading-relaxed text-slate-600">{c.t("about.formation.text")}</p>
        </Card>}
        {c.show("about.show.stats") && stats.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.title} className="rounded-2xl bg-navy-900 p-6 text-center">
                <dt className="text-4xl font-extrabold text-white">{s.title}</dt>
                <dd className="mt-1 text-sm text-slate-300">{s.text}</dd>
              </div>
            ))}
          </dl>
        )}
        {c.show("about.show.vision") && <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card><h2 className="text-2xl">{c.t("about.vision.title")}</h2>
            <p className="mt-3 text-slate-600">{c.t("about.vision.text")}</p></Card>
          <Card><h2 className="text-2xl">{c.t("about.mission.title")}</h2>
            <p className="mt-3 text-slate-600">{c.t("about.mission.text")}</p></Card>
        </div>}
        {c.show("about.show.goals") && <Card className="mt-6"><h2 className="text-2xl">{c.t("about.goals.title")}</h2>
          <ul className="mt-3 list-decimal space-y-1 pl-5 text-slate-600">
            {c.items("goals").map((g) => <li key={g.title}>{g.title}</li>)}
          </ul></Card>}
      </Section>
      {c.show("about.show.forums") && <Section tone="tint" title={c.t("about.forums.title")} intro={c.t("about.forums.intro")}>
        <div className="grid gap-6 md:grid-cols-3">
          {c.items("forums").map((f) => <FeatureCard key={f.title} icon={<Icon name={f.icon} className={i} />} title={f.title}>{f.text}</FeatureCard>)}
        </div>
      </Section>}
      {c.show("about.show.team") && c.items("team").length > 0 && (
        <Section title={c.t("about.team.title")} intro={c.t("about.team.intro")}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.items("team").map((m) => (
              <li key={m.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="font-bold text-navy-900">{m.title}</p>
                <p className="mt-1 text-sm text-slate-600">{m.text}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {c.show("about.show.support") && <Section tone="tint" title={c.t("about.support.title")}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {c.items("support").map((f) => <FeatureCard key={f.title} icon={<Icon name={f.icon} className={i} />} title={f.title}>{f.text}</FeatureCard>)}
        </div>
        <div className="mt-10 text-center"><JoinButton label={c.t("site.join")} /></div>
      </Section>}
    </>
  );
}
