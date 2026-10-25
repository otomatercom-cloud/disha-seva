import { Mail, MapPin } from "lucide-react";
import Link from "next/link";
import { JoinButton } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { NAV, SUPPORT_LINK } from "./site-nav";

export async function Footer() {
  const c = await getContent();
  const email = c.t("site.email");
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="text-lg font-bold text-white">{c.t("site.name")}</p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed">{c.t("footer.about")}</p>
          <JoinButton className="mt-6" label={c.t("site.join")} />
        </div>
        <nav aria-label="Footer">
          <p className="text-sm font-semibold uppercase tracking-wider text-white">{c.t("footer.explore")}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}><Link href={item.href} className="hover:text-white">{c.t(item.key)}</Link></li>
            ))}
            <li><Link href="/membership" className="hover:text-white">{c.t("footer.join")}</Link></li>
            <li><Link href={SUPPORT_LINK.href} className="hover:text-white">{c.t(SUPPORT_LINK.key)}</Link></li>
            <li><Link href="/support/track" className="hover:text-white">{c.t("footer.support")}</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-white">{c.t("footer.contact")}</p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2"><Mail className="size-4" aria-hidden />
              <a href={`mailto:${email}`} className="hover:text-white">{email}</a></li>
            <li className="flex items-center gap-2"><MapPin className="size-4" aria-hidden /> {c.t("site.address")}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {c.t("site.name")}. {c.t("footer.rights")}</p>
          <p className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-white">{c.t("footer.privacy")}</Link>
            <Link href="/terms" className="hover:text-white">{c.t("footer.terms")}</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
