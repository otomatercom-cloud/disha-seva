import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { PhotoGallery } from "@/components/sections/photo-gallery";
import { ButtonLink, JoinButton } from "@/components/ui/button";
import { FeatureCard } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("nav.seva") };
}

export default async function SevaActivitiesPage() {
  const c = await getContent();
  const photos = c.items("gallery").map((g) => ({ src: g.image, alt: g.title }));
  return (
    <>
      <PageHero title={c.t("seva.title")} intro={c.t("seva.intro")} />
      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {c.items("activities").map((a) => (
            <FeatureCard key={a.title} icon={<Icon name={a.icon} className="size-6" />} title={a.title}>{a.text}</FeatureCard>
          ))}
        </div>
      </Section>
      <Section tone="tint" title={c.t("seva.gallery.title")} intro={c.t("seva.gallery.intro")}>
        <PhotoGallery photos={photos} limit={6} />
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/gallery" variant="secondary">{c.t("seva.gallery.link")}</ButtonLink>
          <JoinButton label={c.t("site.join")} />
        </div>
      </Section>
    </>
  );
}
