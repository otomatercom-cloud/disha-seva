export const NAV = [
  { href: "/", key: "nav.home" },
  { href: "/about", key: "nav.about" },
  { href: "/indians-in-ksa", key: "nav.indians" },
  { href: "/seva-activities", key: "nav.seva" },
  { href: "/gallery", key: "nav.gallery" },
  { href: "/collaborations", key: "nav.collab" },
  { href: "/reports", key: "nav.reports" },
  { href: "/contact", key: "nav.contact" },
] as const;

export type NavLink = { href: string; label: string };

export const SUPPORT_LINK = { href: "/support", key: "nav.support" } as const;
