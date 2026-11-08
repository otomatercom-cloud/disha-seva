import type { Metadata, Viewport } from "next";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import "@fontsource/poppins/600.css";
import "./globals.css";
import { getContent } from "@/lib/content";
import { themeCss } from "@/lib/theme";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getContent();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: c.t("seo.title"), template: `%s | ${c.t("site.name")}` },
    description: c.t("seo.description"),
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f3d2e" };

// Refresh Odoo-driven content every 30s even if the site was built without Odoo reachable (otherwise pages stay static forever).
export const revalidate = 30;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const c = await getContent();
  return (
    <html lang="en">
      <head><style id="disha-theme" dangerouslySetInnerHTML={{ __html: themeCss((k) => c.t(k)) }} /></head>
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  );
}
