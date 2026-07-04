import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { CotizacionEditor } from "@/app/components/cotizaciones/CotizacionEditor";
import type { CotizacionItemRow, CotizacionRow } from "@/app/data/cotizaciones";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { LeadRow } from "@/app/data/leads";
import { buildHistoricoPrecios } from "@/lib/cotizacion-historico";
import { canViewLeads } from "@/lib/auth/roles";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CotizacionPage({ params }: PageProps) {
  const user = await requireAuthUser();
  if (!canViewLeads(user.rol)) {
    redirect("/");
  }
  const supabase = await createServerSupabaseClient();
  const { id } = await params;

  const { data: cotizacion, error: cotError } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (cotError || !cotizacion) {
    notFound();
  }

  const cotRow = cotizacion as CotizacionRow;

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", cotRow.lead_id)
    .maybeSingle();

  if (!lead) {
    notFound();
  }

  const { data: items } = await supabase
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", id)
    .order("categoria", { ascending: true });

  const { data: directorio } = await supabase
    .from("directorio_proveedores")
    .select("*")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  const { data: proveedoresHistorico } = await supabase
    .from("proveedores")
    .select("categoria, valor_total")
    .eq("estado", "contratado")
    .gt("valor_total", 0);

  const { data: itemsHistorico } = await supabase
    .from("cotizacion_items")
    .select(
      "categoria, precio_estimado, incluido, cotizaciones(numero_invitados)",
    )
    .eq("incluido", true)
    .neq("cotizacion_id", id);

  const historico = buildHistoricoPrecios(
    (proveedoresHistorico ?? []) as { categoria: string; valor_total: number }[],
    (itemsHistorico ?? []) as unknown as Parameters<
      typeof buildHistoricoPrecios
    >[1],
  );

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-4xl px-6 py-10 sm:px-8">
        <Link
          href={`/leads/${cotRow.lead_id}`}
          className="text-sm font-medium text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          ← Volver al lead
        </Link>

        <CotizacionEditor
          cotizacion={cotRow}
          lead={lead as LeadRow}
          initialItems={(items ?? []) as CotizacionItemRow[]}
          directorio={(directorio ?? []) as DirectorioProveedorRow[]}
          historico={historico}
        />
      </main>
    </div>
  );
}
