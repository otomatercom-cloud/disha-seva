import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { EventDashboard } from "@/components/admin/registrations-editor";
import { ADMIN_COOKIE } from "@/lib/admin/odoo";

export const dynamic = "force-dynamic";

export default async function EventDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  if (!(await cookies()).get(ADMIN_COOKIE)?.value) redirect("/admin/login");
  return (
    <div>
      <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <b className="font-display text-xl text-navy-900">DISHA Admin</b>
        <a href="/admin" className="text-sm text-navy-700 underline">← Back to admin</a></div></header>
      <main className="mx-auto max-w-7xl px-4 py-6"><EventDashboard eventId={id} /></main>
    </div>
  );
}
