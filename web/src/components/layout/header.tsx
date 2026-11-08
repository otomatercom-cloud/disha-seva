"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { JoinButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavLink } from "./site-nav";

export function Header({ nav, name, tagline, logo, joinLabel, support }: {
  nav: NavLink[]; name: string; tagline: string; logo: string; joinLabel: string; support: NavLink | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-white shadow-[0_6px_24px_-12px_rgba(15,61,46,.25)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={`${name} home`}>
          <Image src={logo} alt="" width={40} height={40} className="size-10 object-contain" />
          <span className="font-display text-2xl font-bold leading-[1.1] text-navy-900">
            {name}
            <span className="hidden max-w-[190px] xl:block font-sans text-[10px] font-normal leading-snug text-slate-500">{tagline}</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-0.5 min-[1120px]:flex xl:gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap rounded-full px-2 py-2 text-[13px] font-medium xl:px-2.5 xl:text-sm text-slate-700 transition hover:text-navy-700 after:absolute after:bottom-0.5 after:left-1/2 after:h-0.5 after:w-0 after:-translate-x-1/2 after:bg-saffron-500 after:transition-all hover:after:w-[55%]",
                pathname === item.href && "text-navy-700 after:w-[55%]",
              )}
            >
              {item.label}
            </Link>
          ))}
          {support && <Link href={support.href} className={cn("ml-1 whitespace-nowrap rounded-full border-2 border-navy-900 px-3 py-1.5 text-[13px] xl:px-4 xl:text-sm font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white",
            pathname.startsWith("/support") && "bg-navy-900 text-white")}>{support.label}</Link>}
          <JoinButton className="ml-1 whitespace-nowrap px-4 py-2 xl:px-5" label={joinLabel} />
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-900 min-[1120px]:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-slate-200 bg-white px-4 pb-4 min-[1120px]:hidden">
          <ul className="flex flex-col py-2">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="block rounded-lg px-3 py-3 text-base font-medium text-navy-900 hover:bg-navy-50"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          {support && <Link href={support.href} onClick={() => setOpen(false)}
            className="mb-3 block rounded-full border-2 border-navy-900 px-4 py-3 text-center font-semibold text-navy-900">{support.label}</Link>}
          <JoinButton className="w-full" label={joinLabel} />
        </nav>
      )}
    </header>
  );
}
