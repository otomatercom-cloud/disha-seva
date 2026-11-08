import type { Metadata } from "next";
import Link from "next/link";
import { TrackForm } from "@/components/forms/track-form";
import { PageHero, Section } from "@/components/sections/page-hero";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { title: c.t("track.title"), robots: { index: false } };
}

export default async function TrackPage() {
  const c = await getContent();
  return (
    <>
      <PageHero title={c.t("track.title")} intro={c.t("track.intro")} />
      <Section>
        <div className="mx-auto max-w-3xl">
          <TrackForm />
          <p className="mt-8 text-center text-sm text-slate-600">
            <Link href="/support" className="font-semibold text-navy-900 underline">{c.t("track.new")}</Link>
          </p>
        </div>
      </Section>
    </>
  );
}
