import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  ComisionesAdminClient,
  type BodaComisionOption,
  type ProveedorComisionRow,
} from "./ComisionesAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminComisionesPage() {
  const user = await requireAdminUser();
  const supabase = await createServerSupabaseClient();

  const { data: bodas, error: bodasError } = await supabase
    .from("bodas")
    .select("id, nombre_pareja, fecha_boda")
    .order("fecha_boda", { ascending: false });

  if (bodasError) {
    throw new Error(bodasError.message);
  }

  const { data: proveedores, error: proveedoresError } = await supabase
    .from("proveedores")
    .select("*, bodas(id, nombre_pareja, fecha_boda)")
    .eq("da_comision", true)
    .order("nombre", { ascending: true });

  if (proveedoresError) {
    throw new Error(proveedoresError.message);
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

        <h1 className="mt-6 font-display text-3xl text-bloom-ink">Comisiones</h1>
        <p className="mt-1 text-sm text-bloom-muted">
          Seguimiento de comisiones por proveedor y boda.
        </p>

        <ComisionesAdminClient
          bodas={(bodas ?? []) as BodaComisionOption[]}
          proveedores={(proveedores ?? []) as ProveedorComisionRow[]}
        />
      </main>
    </div>
  );
}
