import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClienteCotizacionBar } from "@/app/components/cliente/ClienteCotizacionBar";
import { ClientePwaInstallBanner } from "@/app/components/cliente/ClientePwaInstallBanner";
import { ClienteBodaEstado } from "@/app/components/cliente/ClienteBodaEstado";
import { ClienteCronograma } from "@/app/components/cliente/ClienteCronograma";
import { ClienteDetallesCelebracionSection } from "@/app/components/cliente/ClienteDetallesCelebracionSection";
import { ClienteProveedoresSugeridosSection } from "@/app/components/cliente/ClienteProveedoresSugeridosSection";
import { ClienteTastingsSection } from "@/app/components/cliente/ClienteTastingsSection";
import { ClientePageFooter } from "@/app/components/cliente/ClientePageFooter";
import { ClientePageHeader } from "@/app/components/cliente/ClientePageHeader";
import { ClienteHelpGuide } from "@/app/components/cliente/ClienteHelpGuide";
import { ClientePaymentOverview } from "@/app/components/cliente/ClientePaymentOverview";
import { ClienteProveedoresEvaluacionSection } from "@/app/components/cliente/ClienteProveedoresEvaluacionSection";
import { ClienteProveedoresSection } from "@/app/components/cliente/ClienteProveedoresSection";
import { ClienteProximosPagos } from "@/app/components/cliente/ClienteProximosPagos";
import { ClienteSeatingPlanSection } from "@/app/components/cliente/ClienteSeatingPlanSection";
import type { CronogramaItemRow } from "@/app/data/cronograma";
import type { DetallesCelebracionRow } from "@/app/data/detalles-celebracion";
import { fetchProveedoresSugeridosForBoda } from "@/app/data/proveedores-sugeridos";
import { sortTastingsBySchedule, type TastingRow } from "@/app/data/tastings";
import type { BodaRow } from "@/app/data/weddings";
import {
  computePaymentProjection,
  type ProveedorRow,
} from "@/app/data/providers";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import { buildClientePagosPendientes } from "@/lib/cliente-pagos";
import { buildClienteBodaEstadoResumen, computeClienteProveedoresResumen } from "@/lib/cliente-boda-estado";
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
import { getTasaCambioCopPorUsd } from "@/lib/tasa-cambio";

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

  const { data: proveedoresData } = await supabase
    .from("proveedores")
    .select("*")
    .eq("boda_id", id)
    .in("estado", ["contratado", "en_negociacion"])
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

  const { data: tastingsData } = await supabase
    .from("tastings")
    .select("*")
    .eq("boda_id", id);

  const { data: detallesCelebracionData } = await supabase
    .from("detalles_celebracion")
    .select("*")
    .eq("boda_id", id)
    .maybeSingle();

  const proveedoresVisibles = (proveedoresData ?? []) as ProveedorRow[];
  const contratados = proveedoresVisibles.filter(
    (provider) => provider.estado === "contratado",
  );
  const enEvaluacion = proveedoresVisibles.filter(
    (provider) => provider.estado === "en_negociacion",
  );
  const proveedoresCronograma = (proveedoresCronogramaData ??
    []) as ClienteCronogramaProveedor[];
  const cronogramaItems = (cronogramaData ?? []) as CronogramaItemRow[];
  const tastings = sortTastingsBySchedule((tastingsData ?? []) as TastingRow[]);
  const detallesCelebracion =
    (detallesCelebracionData as DetallesCelebracionRow | null) ?? null;
  const proveedoresSugeridos = await fetchProveedoresSugeridosForBoda(
    supabase,
    id,
  );
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
  const { itemsCompletados, totalItems } =
    computeClienteProveedoresResumen(cronogramaItems);
  const estadoBoda = buildClienteBodaEstadoResumen({
    fechaBoda: bodaRow.fecha_boda,
    itemsCompletados,
    totalCronogramaItems: totalItems,
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

  const mostrarUsdCliente = Boolean(bodaRow.mostrar_usd_cliente);
  const permitirExcelCliente = Boolean(bodaRow.permitir_excel_cliente);

  const showDownloadBar =
    cotizacionDisponible ||
    contratados.length > 0 ||
    (mostrarSeatingPlan && !cotizacionDisponible);

  const tasaCambio = mostrarUsdCliente ? await getTasaCambioCopPorUsd() : null;
  const copPorUsd = mostrarUsdCliente ? (tasaCambio?.copPorUsd ?? null) : null;

  return (
    <div className="flex min-h-full flex-col bg-bloom-canvas">
      <ClientePwaInstallBanner bodaId={id} />
      <ClientePageHeader
        nombrePareja={bodaRow.nombre_pareja}
        fechaBoda={bodaRow.fecha_boda}
        ciudad={bodaRow.ciudad}
        showLanguageToggle={!showDownloadBar}
      />

      {showDownloadBar && (
        <ClienteCotizacionBar
          bodaId={id}
          cotizacionDisponible={cotizacionDisponible}
          hasProyeccionActual={contratados.length > 0}
          allowExcelDownload={permitirExcelCliente}
          seatingPlanLink={mostrarSeatingPlan ? seatingPlanLink : null}
        />
      )}

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-12 px-5 py-12 sm:space-y-14 sm:px-8 sm:py-16">
        <ClienteBodaEstado estado={estadoBoda} />
        <ClienteDetallesCelebracionSection
          bodaId={id}
          initialDetalles={detallesCelebracion}
          telefonoNovia={bodaRow.telefono_novia}
        />
        <ClienteTastingsSection
          tastings={tastings}
          nombrePareja={bodaRow.nombre_pareja}
          fechaBoda={bodaRow.fecha_boda}
        />
        <ClienteCronograma resumen={cronogramaResumen} />
        <ClienteProximosPagos pagosPendientes={pagosPendientes} />
        <ClienteProveedoresSection
          contratados={contratados}
          pagosByProveedor={pagosByProveedor}
          copPorUsd={copPorUsd}
        />
        <ClienteProveedoresEvaluacionSection
          proveedores={enEvaluacion}
          copPorUsd={copPorUsd}
        />
        <ClientePaymentOverview
          totalContratado={totalContratado}
          totalPagado={totalPagado}
          saldoPendiente={saldoPendiente}
          copPorUsd={copPorUsd}
        />
        <ClienteProveedoresSugeridosSection
          bodaId={id}
          initialProveedores={proveedoresSugeridos}
        />
        {mostrarSeatingPlan && (
          <ClienteSeatingPlanSection link={seatingPlanLink} />
        )}
      </main>

      <ClientePageFooter />
      <ClienteHelpGuide />
    </div>
  );
}
