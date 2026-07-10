import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { TareasPageClient } from "@/app/components/tareas/TareasPageClient";
import {
  isTareaVisibleForUser,
  normalizeTareaPrioridad,
  type TareaRow,
} from "@/app/data/tareas";
import { isBodaActiva } from "@/lib/boda-estado";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();

  const { data: tareasData, error: tareasError } = await supabase
    .from("tareas")
    .select("*")
    .order("created_at", { ascending: false });

  if (tareasError) {
    throw new Error(tareasError.message);
  }

  const tareas = ((tareasData ?? []) as TareaRow[])
    .map((tarea) => ({
      ...tarea,
      prioridad: normalizeTareaPrioridad(tarea.prioridad),
    }))
    .filter((tarea) => isTareaVisibleForUser(tarea, user.username));

  const { data: bodasData } = await supabase
    .from("bodas")
    .select("id, nombre_pareja, estado")
    .order("nombre_pareja", { ascending: true });

  const bodas = (bodasData ?? [])
    .filter((boda) => isBodaActiva(boda.estado))
    .map((boda) => ({
      id: boda.id as string,
      nombre_pareja: boda.nombre_pareja as string,
    }));

  const { data: equipoData } = await supabase
    .from("user_profiles")
    .select("id, username, nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  const equipo = (equipoData ?? []).map((row) => ({
    id: row.id as string,
    username: row.username as string,
    nombre: row.nombre as string,
  }));

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

        <h1 className="mt-6 font-display text-3xl text-bloom-ink">Tareas</h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Tus tareas asignadas y las que creaste para el equipo.
        </p>

        <TareasPageClient
          initialTareas={tareas}
          equipo={equipo}
          bodas={bodas}
          currentUsername={user.username}
        />
      </main>
    </div>
  );
}
