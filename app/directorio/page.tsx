import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import { DirectorioPageClient } from "@/app/components/directorio/DirectorioPageClient";

export const dynamic = "force-dynamic";

export default async function DirectorioPage() {
  const user = await requireAuthUser();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("directorio_proveedores")
    .select("*")
    .order("categoria", { ascending: true })
    .order("nombre", { ascending: true });

  if (error) {
    console.error(error);
  }

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          <ChevronLeftIcon />
          Volver
        </Link>
        <DirectorioPageClient
          initialRows={(data ?? []) as DirectorioProveedorRow[]}
          role={user.rol}
        />
      </main>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
