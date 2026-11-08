import type { Metadata } from "next";

export const metadata: Metadata = { title: "DISHA Admin", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f5f8f6] text-slate-800">{children}</div>;
}
