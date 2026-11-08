import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/admin-app";
import { ADMIN_COOKIE } from "@/lib/admin/odoo";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await cookies()).get(ADMIN_COOKIE)?.value) redirect("/admin/login");
  return <AdminApp />;
}
