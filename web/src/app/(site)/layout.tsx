import { Footer } from "@/components/layout/footer";
import { Topbar } from "@/components/layout/topbar";
import { Header } from "@/components/layout/header";
import { NAV, SUPPORT_LINK } from "@/components/layout/site-nav";
import { getContent } from "@/lib/content";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const c = await getContent();
  const shown = (key: string) => c.t(`navshow.${key.split(".")[1]}`).trim().toLowerCase() !== "no";
  return (
    <>
      <Topbar />
      <Header
        nav={NAV.filter((n) => n.key === "nav.home" || shown(n.key)).map((n) => ({ href: n.href, label: c.t(n.key) }))}
        name={c.t("site.name")} tagline={c.t("site.tagline")}
        logo={c.img("site.logo") ?? ""} joinLabel={c.t("site.join")}
        support={shown(SUPPORT_LINK.key) ? { href: SUPPORT_LINK.href, label: c.t(SUPPORT_LINK.key) } : null}
      />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
