import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import type { AuditoriaRow } from "@/app/data/auditoria";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { AuditoriaAdminClient } from "./AuditoriaAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminAuditoriaPage() {
  const user = await requireAdminUser();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("auditoria")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          ← Volver
        </Link>

        <h1 className="mt-6 font-display text-3xl text-bloom-ink">Auditoría</h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Historial de acciones realizadas en Bloom.
        </p>

        <AuditoriaAdminClient registros={(data ?? []) as AuditoriaRow[]} />
      </main>
    </div>
  );
}
