import { redirect } from "next/navigation";
import { canViewLeads } from "@/lib/auth/roles";
import { requireAuthUser } from "@/lib/auth/user-profiles";

export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuthUser();
  if (!canViewLeads(user.rol)) {
    redirect("/");
  }
  return children;
}
