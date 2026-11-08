import type { Metadata } from "next";
import { PageHero, Prose } from "@/components/sections/page-hero";
import { RichText } from "@/components/ui/rich-text";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getContent()).t("terms.title") };
}

export default async function Page() {
  const c = await getContent();
  return (
    <>
      <PageHero title={c.t("terms.title")} intro={c.t("terms.intro")} />
      <Prose>
        {/* DRAFT text: DISHA's committee / legal adviser must review before launch (edit in Odoo > Website Content). */}
        <RichText source={c.t("terms.body")} email={c.t("site.email")} />
      </Prose>
    </>
  );
}
