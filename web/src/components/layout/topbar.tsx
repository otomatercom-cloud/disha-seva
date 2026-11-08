import Link from "next/link";
import { getContent } from "@/lib/content";

export async function Topbar() {
  const c = await getContent();
  const email = c.t("site.email");
  return (
    <div className="bg-navy-900 py-2.5 text-sm text-[#d7e8e0]">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 sm:px-6 lg:px-8">
        <p className="flex flex-wrap gap-x-6 gap-y-1">
          <a href={`mailto:${email}`} className="hover:text-saffron-500">{email}</a>
          <span>{c.t("site.address")}</span>
          <span className="hidden sm:inline">{c.t("site.hours")}</span>
        </p>
        <p className="hidden gap-2 md:flex">
          <Link href="/membership" className="hover:text-saffron-500">{c.t("site.join")}</Link>
          <span aria-hidden>/</span>
          <Link href="/support/track" className="hover:text-saffron-500">{c.t("footer.support")}</Link>
        </p>
      </div>
    </div>
  );
}
