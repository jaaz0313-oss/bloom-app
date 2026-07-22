import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import { CompartirCarpetasDriveButton } from "./CompartirCarpetasDriveButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdminUser();

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
          Administración
        </h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Herramientas de mantenimiento y configuración del equipo.
        </p>

        <div className="mt-8 space-y-6">
          <CompartirCarpetasDriveButton />
        </div>
      </main>
    </div>
  );
}
