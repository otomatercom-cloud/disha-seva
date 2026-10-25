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
  nav: NavLink[]; name: string; tagline: string; logo: string; joinLabel: string; support: NavLink;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label={`${name} home`}>
          <Image src={logo} alt="" width={40} height={40} className="size-10 object-contain" />
          <span className="text-base font-bold leading-tight text-navy-900">
            {name}
            <span className="block text-[11px] font-medium text-slate-500">{tagline}</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 xl:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={cn(
                "rounded-full px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-navy-50 hover:text-navy-900",
                pathname === item.href && "bg-navy-50 text-navy-900",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link href={support.href} className={cn("ml-1 rounded-full border-2 border-navy-900 px-4 py-1.5 text-sm font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white",
            pathname.startsWith("/support") && "bg-navy-900 text-white")}>{support.label}</Link>
          <JoinButton className="ml-1 px-5 py-2" label={joinLabel} />
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-navy-900 xl:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-slate-200 bg-white px-4 pb-4 xl:hidden">
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
          <Link href={support.href} onClick={() => setOpen(false)}
            className="mb-3 block rounded-full border-2 border-navy-900 px-4 py-3 text-center font-semibold text-navy-900">{support.label}</Link>
          <JoinButton className="w-full" label={joinLabel} />
        </nav>
      )}
    </header>
  );
}
