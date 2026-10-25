import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { NAV, SUPPORT_LINK } from "@/components/layout/site-nav";
import { getContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: c.t("seo.title"), template: `%s | ${c.t("site.name")}` },
    description: c.t("seo.description"),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0c1b5e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await getContent();
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <Header
          nav={NAV.map((n) => ({ href: n.href, label: c.t(n.key) }))}
          name={c.t("site.name")} tagline={c.t("site.tagline")}
          logo={c.img("site.logo") ?? ""} joinLabel={c.t("site.join")}
          support={{ href: SUPPORT_LINK.href, label: c.t(SUPPORT_LINK.key) }}
        />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
