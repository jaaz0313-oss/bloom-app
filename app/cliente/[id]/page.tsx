import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClienteCotizacionBar } from "@/app/components/cliente/ClienteCotizacionBar";
import { ClienteDescargarProyeccionButton } from "@/app/components/cliente/ClienteDescargarProyeccionButton";
import { ClienteBodaEstado } from "@/app/components/cliente/ClienteBodaEstado";
import { ClienteCronograma } from "@/app/components/cliente/ClienteCronograma";
import { ClientePageFooter } from "@/app/components/cliente/ClientePageFooter";
import { ClientePageHeader } from "@/app/components/cliente/ClientePageHeader";
import { ClientePaymentOverview } from "@/app/components/cliente/ClientePaymentOverview";
import { ClienteProveedoresSection } from "@/app/components/cliente/ClienteProveedoresSection";
import { ClienteProximosPagos } from "@/app/components/cliente/ClienteProximosPagos";
import { ClienteSeatingPlanSection } from "@/app/components/cliente/ClienteSeatingPlanSection";
import type { CronogramaItemRow } from "@/app/data/cronograma";
import type { BodaRow } from "@/app/data/weddings";
import {
  computePaymentProjection,
  type ProveedorRow,
} from "@/app/data/providers";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import { buildClientePagosPendientes } from "@/lib/cliente-pagos";
import { buildClienteBodaEstadoResumen } from "@/lib/cliente-boda-estado";
import {
  buildClienteCronogramaResumen,
  type ClienteCronogramaProveedor,
} from "@/lib/cliente-cronograma";
import {
  getClienteCotizacionContext,
  hasClienteCotizacionDisponible,
} from "@/lib/cliente-cotizacion";
import { shouldShowClienteSeatingPlan } from "@/lib/cliente-seating-plan";
import { createPublicSupabaseClient } from "@/lib/supabase-public";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createPublicSupabaseClient();

  const { data } = await supabase
    .from("bodas")
    .select("nombre_pareja")
    .eq("id", id)
    .maybeSingle();

  const nombre = (data as { nombre_pareja: string } | null)?.nombre_pareja;

  return {
    title: nombre
      ? `${nombre} — Bloom by Celestia`
      : "Su boda — Bloom by Celestia",
    description:
      "Resumen de proveedores contratados y pagos pendientes para tu boda.",
  };
}

export default async function ClienteBodaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createPublicSupabaseClient();

  const { data: boda, error: bodaError } = await supabase
    .from("bodas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (bodaError || !boda) {
    notFound();
  }

  const bodaRow = boda as BodaRow;

  const { data: proveedoresContratadosData } = await supabase
    .from("proveedores")
    .select("*")
    .eq("boda_id", id)
    .eq("estado", "contratado")
    .order("categoria", { ascending: true });

  const { data: proveedoresCronogramaData } = await supabase
    .from("proveedores")
    .select("nombre, categoria, estado")
    .eq("boda_id", id)
    .neq("estado", "descartado");

  const { data: cronogramaData } = await supabase
    .from("cronograma_items")
    .select("*")
    .eq("boda_id", id)
    .order("fecha_limite", { ascending: true });

  const contratados = (proveedoresContratadosData ?? []) as ProveedorRow[];
  const proveedoresCronograma = (proveedoresCronogramaData ??
    []) as ClienteCronogramaProveedor[];
  const cronogramaItems = (cronogramaData ?? []) as CronogramaItemRow[];
  const providerIds = contratados.map((provider) => provider.id);
  let pagosByProveedor: Record<string, PagoRow[]> = {};

  if (providerIds.length > 0) {
    const { data: pagosData } = await supabase
      .from("pagos")
      .select("*")
      .in("proveedor_id", providerIds)
      .order("fecha_pago", { ascending: false });

    if (pagosData) {
      pagosByProveedor = groupPagosByProveedor(pagosData as PagoRow[]);
    }
  }

  const { totalContratado, totalPagado, saldoPendiente } = computePaymentProjection(
    contratados,
    pagosByProveedor,
  );
  const pagosPendientes = buildClientePagosPendientes(
    contratados,
    pagosByProveedor,
  );
  const estadoBoda = buildClienteBodaEstadoResumen({
    fechaBoda: bodaRow.fecha_boda,
    proveedoresContratados: bodaRow.proveedores_contratados,
    totalProveedores: bodaRow.total_proveedores,
    totalContratado,
    totalPagado,
  });
  const cronogramaResumen = buildClienteCronogramaResumen(
    cronogramaItems,
    proveedoresCronograma,
  );
  const cotizacionContext = await getClienteCotizacionContext(supabase, id);
  const cotizacionDisponible = hasClienteCotizacionDisponible(cotizacionContext);
  const seatingPlanLink = bodaRow.seating_plan_link?.trim() ?? "";
  const mostrarSeatingPlan =
    Boolean(seatingPlanLink) &&
    shouldShowClienteSeatingPlan(cronogramaItems, bodaRow.fecha_boda);

  const showCotizacionBar =
    cotizacionDisponible || (mostrarSeatingPlan && !cotizacionDisponible);

  return (
    <div className="flex min-h-full flex-col bg-bloom-canvas">
      <ClientePageHeader
        nombrePareja={bodaRow.nombre_pareja}
        fechaBoda={bodaRow.fecha_boda}
        ciudad={bodaRow.ciudad}
      />

      {showCotizacionBar && (
        <ClienteCotizacionBar
          bodaId={id}
          cotizacionDisponible={cotizacionDisponible}
          seatingPlanLink={mostrarSeatingPlan ? seatingPlanLink : null}
        />
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-12 px-5 py-12 sm:space-y-14 sm:px-8 sm:py-16">
        <ClienteBodaEstado estado={estadoBoda} />
        <ClienteCronograma resumen={cronogramaResumen} />
        {mostrarSeatingPlan && (
          <ClienteSeatingPlanSection link={seatingPlanLink} />
        )}
        <ClientePaymentOverview
          totalContratado={totalContratado}
          totalPagado={totalPagado}
          saldoPendiente={saldoPendiente}
        />
        {contratados.length > 0 && (
          <div className="flex justify-center">
            <ClienteDescargarProyeccionButton bodaId={id} />
          </div>
        )}
        <ClienteProximosPagos pagosPendientes={pagosPendientes} />
        <ClienteProveedoresSection
          contratados={contratados}
          pagosByProveedor={pagosByProveedor}
        />
      </main>

      <ClientePageFooter />
    </div>
  );
}
