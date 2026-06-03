import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { UserAdminPanel } from "./UserAdminPanel";
import {
  createUserAction,
  setUserActiveAction,
  updateUserAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminUsuariosPage() {
  const user = await requireAdminUser();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, username, nombre, telefono, email, rol, activo, google_access_token")
    .order("created_at", { ascending: true });

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

        <h1 className="mt-6 font-display text-3xl text-bloom-ink">
          Administrar usuarios
        </h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Crea, actualiza y activa/desactiva usuarios del equipo.
        </p>

        <div className="mt-6">
          <UserAdminPanel
            users={(data ?? []).map((row) => ({
              id: row.id,
              username: row.username,
              nombre: row.nombre,
              telefono: row.telefono,
              email: row.email,
              rol: row.rol,
              activo: row.activo,
              googleConnected: Boolean(
                (row as { google_access_token: string | null }).google_access_token,
              ),
            }))}
            currentUserId={user.id}
            createUserAction={createUserAction}
            updateUserAction={updateUserAction}
            setUserActiveAction={setUserActiveAction}
          />
        </div>
      </main>
    </div>
  );
}
