import type { Metadata } from "next";
import { PageHero, Section } from "@/components/sections/page-hero";
import { PhotoGallery } from "@/components/sections/photo-gallery";
import { JoinButton } from "@/components/ui/button";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return { title: c.t("gallery.title"), description: c.t("gallery.intro") };
}

export default async function GalleryPage() {
  const c = await getContent();
  const photos = c.items("gallery").map((g) => ({ src: g.image, alt: g.title }));
  return (
    <>
      <PageHero title={c.t("gallery.title")} intro={c.t("gallery.intro")} />
      <Section>
        <PhotoGallery photos={photos} />
        <div className="mt-12 text-center">
          <p className="mb-4 text-slate-600">{c.t("gallery.cta")}</p>
          <JoinButton label={c.t("site.join")} />
        </div>
      </Section>
    </>
  );
}
