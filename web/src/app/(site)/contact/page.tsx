import { Clock, Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { JoinButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("contact.title") };
}

export default async function ContactPage() {
  const c = await getContent();
  const email = c.t("site.email");
  return (
    <>
      <PageHero title={c.t("contact.title")} intro={c.t("contact.intro")} />
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Card><Mail className="size-6 text-navy-900" aria-hidden /><h2 className="mt-3 text-lg">{c.t("contact.email_label")}</h2>
            <a className="mt-1 block text-sm text-navy-900 underline" href={`mailto:${email}`}>{email}</a></Card>
          <Card><MapPin className="size-6 text-navy-900" aria-hidden /><h2 className="mt-3 text-lg">{c.t("contact.address_label")}</h2>
            <p className="mt-1 text-sm text-slate-600">{c.t("site.address")}</p></Card>
          <Card><Clock className="size-6 text-navy-900" aria-hidden /><h2 className="mt-3 text-lg">{c.t("contact.hours_label")}</h2>
            <p className="mt-1 text-sm text-slate-600">{c.t("site.hours")}</p></Card>
        </div>
        <div className="mt-12 text-center">
          <p className="mb-4 text-slate-600">{c.t("contact.cta")}</p>
          <JoinButton label={c.t("site.join")} />
        </div>
      </Section>
    </>
  );
}
