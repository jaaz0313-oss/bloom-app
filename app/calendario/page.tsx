import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { CalendarioClient } from "@/app/components/citas/CalendarioClient";
import type { CitaRow } from "@/app/data/citas";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();

  const { data: citas, error: citasError } = await supabase
    .from("citas")
    .select("*")
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  if (citasError) {
    throw new Error(citasError.message);
  }

  const { data: bodas } = await supabase
    .from("bodas")
    .select(
      "id, nombre_pareja, telefono_novia, telefono_novio, email_novia, email_novio",
    )
    .order("nombre_pareja", { ascending: true });

  const { data: leads } = await supabase
    .from("leads")
    .select("id, nombre_pareja")
    .order("nombre_pareja", { ascending: true });

  const { data: equipo } = await supabase
    .from("user_profiles")
    .select("id, nombre, username, email")
    .eq("activo", true)
    .order("nombre", { ascending: true });

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

        <h1 className="mt-6 font-display text-3xl text-bloom-ink">Calendario</h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Citas y reuniones del equipo.
        </p>

        <CalendarioClient
          citas={(citas ?? []) as CitaRow[]}
          bodas={bodas ?? []}
          leads={leads ?? []}
          equipo={equipo ?? []}
          role={user.rol}
          currentUserId={user.id}
          currentUserNombre={user.nombre}
        />
      </main>
    </div>
  );
}
