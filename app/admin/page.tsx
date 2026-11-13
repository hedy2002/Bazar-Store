import { AdminDashboard } from "@/components/admin-dashboard";
import { redirect } from "next/navigation";
import { canAccessAdmin } from "@/lib/auth";
import { getServerUser } from "@/lib/supabase-server";

export const metadata = { title: "Admin | Bazar" };

export default async function AdminPage() {
  const user = await getServerUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (!canAccessAdmin(user.email)) redirect("/en");

  return <AdminDashboard />;
}
