"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";

type DashboardHeaderProps = {
  user: {
    nombre: string;
    rol: UserRole;
  };
};

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-bloom-border bg-bloom-surface/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 py-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bloom-accent text-lg font-semibold text-white shadow-sm"
              aria-hidden
            >
              B
            </div>
            <div>
              <p className="font-display text-2xl tracking-wide text-bloom-ink">
                Bloom
              </p>
              <p className="text-sm text-bloom-muted">Gestión de bodas</p>
            </div>
          </div>

          <div className="min-w-0 text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
              {ROLE_LABELS[user.rol]}
            </p>
            <p className="font-medium text-bloom-ink">{user.nombre}</p>
            <div className="mt-2 flex items-center justify-end gap-2">
              {user.rol === "admin" && (
                <Link
                  href="/admin/usuarios"
                  className="rounded-full border border-bloom-border px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
                >
                  Usuarios
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-bloom-border px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
