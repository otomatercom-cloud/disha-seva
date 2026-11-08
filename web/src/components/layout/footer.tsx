import { Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { JoinButton } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { NAV, SUPPORT_LINK } from "./site-nav";

export async function Footer() {
  const c = await getContent();
  const email = c.t("site.email");
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-[#bcd3c8]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[380px] rounded-full border-[50px] border-saffron-500/10" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 md:grid-cols-[1.4fr_1fr_1fr] sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-2xl font-bold text-white">{c.t("site.name")}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">{c.t("footer.about")}</p>
          <JoinButton className="mt-6" label={c.t("site.join")} />
        </div>
        <nav aria-label="Footer">
          <p className="font-display relative pb-3 text-xl font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-10 after:bg-saffron-500">{c.t("footer.explore")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {NAV.filter((n) => n.key === "nav.home" || c.t(`navshow.${n.key.split(".")[1]}`).trim().toLowerCase() !== "no").map((item) => (
              <li key={item.href}><Link href={item.href} className="hover:text-saffron-500">{c.t(item.key)}</Link></li>
            ))}
            <li><Link href="/membership" className="hover:text-saffron-500">{c.t("footer.join")}</Link></li>
            <li><Link href={SUPPORT_LINK.href} className="hover:text-saffron-500">{c.t(SUPPORT_LINK.key)}</Link></li>
            <li><Link href="/support/track" className="hover:text-saffron-500">{c.t("footer.support")}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="font-display relative pb-3 text-xl font-semibold text-white after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-10 after:bg-saffron-500">{c.t("footer.contact")}</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden />
              <a href={`mailto:${email}`} className="hover:text-saffron-500">{email}</a></li>
            <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {c.t("site.address")}</li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {c.t("site.name")}. {c.t("footer.rights")}</p>
          <p className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-saffron-500">{c.t("footer.privacy")}</Link>
            <Link href="/terms" className="hover:text-saffron-500">{c.t("footer.terms")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
