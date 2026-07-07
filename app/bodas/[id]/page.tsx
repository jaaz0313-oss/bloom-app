import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { BodaDetailSections } from "@/app/components/bodas/BodaDetailSections";
import { DeleteWeddingButton } from "@/app/components/bodas/DeleteWeddingButton";
import { RevertirALeadButton } from "@/app/components/bodas/RevertirALeadButton";
import { ClientePortalQrButton } from "@/app/components/bodas/ClientePortalQrButton";
import { BodaCotizacionInicialButton } from "@/app/components/bodas/BodaCotizacionInicialButton";
import { BodaFechaConfirmada } from "@/app/components/bodas/BodaFechaConfirmada";
import { BodaNumInvitados } from "@/app/components/bodas/BodaNumInvitados";
import { ShareWithClientButton } from "@/app/components/bodas/ShareWithClientButton";
import type { CitaRow } from "@/app/data/citas";
import type { BriefBodaRow } from "@/app/data/brief-boda";
import type { ContratoRow } from "@/app/data/contratos";
import type { NotaBodaRow } from "@/app/data/notas-boda";
import { fetchNotasReunionForBoda } from "@/app/data/notas-reunion";
import type { DetallesCelebracionRow } from "@/app/data/detalles-celebracion";
import { fetchProveedoresSugeridosForBoda } from "@/app/data/proveedores-sugeridos";
import { sortTastingsBySchedule, type TastingRow } from "@/app/data/tastings";
import type { BodaRow } from "@/app/data/weddings";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import type { ProveedorRow } from "@/app/data/providers";
import {
  hasBriefContent,
  hasClientInfoContent,
  hasContratoContent,
} from "@/lib/boda-section-content";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { hasPermission, isAdminRole } from "@/lib/auth/roles";
import type { EquipoUsuarioMencion } from "@/lib/notas-menciones";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ section?: string; proveedor?: string }>;
};

export default async function BodaDetailPage({ params, searchParams }: PageProps) {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const openSection = resolvedSearchParams?.section ?? null;
  const highlightProveedorId = resolvedSearchParams?.proveedor ?? null;

  const { data: boda, error: bodaError } = await supabase
    .from("bodas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (bodaError) {
    console.error(bodaError);
    notFound();
  }

  if (!boda) {
    notFound();
  }

  const bodaRow = boda as BodaRow;

  const { data: proveedores, error: proveedoresError } = await supabase
    .from("proveedores")
    .select("*")
    .eq("boda_id", id)
    .order("created_at", { ascending: true });

  if (proveedoresError) {
    console.error(proveedoresError);
  }

  const providers = (proveedores ?? []) as ProveedorRow[];

  const providerIds = providers.map((p) => p.id);
  let pagosByProveedor: Record<string, PagoRow[]> = {};

  if (providerIds.length > 0) {
    const { data: pagos, error: pagosError } = await supabase
      .from("pagos")
      .select("*")
      .in("proveedor_id", providerIds)
      .order("fecha_pago", { ascending: false });

    if (pagosError) {
      console.error(pagosError);
    } else if (pagos) {
      pagosByProveedor = groupPagosByProveedor(pagos as PagoRow[]);
    }
  }

  const { data: notasData, error: notasError } = await supabase
    .from("notas_boda")
    .select("*")
    .eq("boda_id", id)
    .order("created_at", { ascending: false });

  if (notasError) {
    console.error(notasError);
  }

  const notas = (notasData ?? []) as NotaBodaRow[];

  const notasReunion = await fetchNotasReunionForBoda(supabase, id);

  const { data: tastingsData } = await supabase
    .from("tastings")
    .select("*")
    .eq("boda_id", id)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const tastings = sortTastingsBySchedule(
    (tastingsData ?? []) as TastingRow[],
  );

  const { data: detallesCelebracionData } = await supabase
    .from("detalles_celebracion")
    .select("*")
    .eq("boda_id", id)
    .maybeSingle();

  const detallesCelebracion =
    (detallesCelebracionData as DetallesCelebracionRow | null) ?? null;

  const proveedoresSugeridos = await fetchProveedoresSugeridosForBoda(
    supabase,
    id,
  );

  const { data: briefData } = await supabase
    .from("brief_boda")
    .select("*")
    .eq("boda_id", id)
    .maybeSingle();

  const brief = (briefData as BriefBodaRow | null) ?? null;

  const { data: contratoData } = await supabase
    .from("contratos")
    .select("*")
    .eq("boda_id", id)
    .maybeSingle();

  const contrato = (contratoData as ContratoRow | null) ?? null;

  const { count: cronogramaCount } = await supabase
    .from("cronograma_items")
    .select("*", { count: "exact", head: true })
    .eq("boda_id", id);

  const { data: equipoData, error: equipoError } = await supabase
    .from("user_profiles")
    .select("id, nombre, username, telefono, email")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (equipoError) {
    console.error(equipoError);
  }

  const equipo = (equipoData ?? []) as EquipoUsuarioMencion[];

  const { data: citasData } = await supabase
    .from("citas")
    .select("*")
    .eq("boda_id", id)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const { data: bodasLookup } = await supabase
    .from("bodas")
    .select(
      "id, nombre_pareja, telefono_novia, telefono_novio, whatsapp_grupo_link, email_novia, email_novio",
    )
    .order("nombre_pareja", { ascending: true });

  const { data: leadsLookup } = await supabase
    .from("leads")
    .select("id, nombre_pareja")
    .order("nombre_pareja", { ascending: true });

  const equipoCitas = (equipoData ?? []).map((u) => ({
    id: u.id,
    nombre: u.nombre,
    username: u.username,
    email: u.email ?? null,
  }));

  const canViewBrief = ["admin", "lider", "coordinadora"].includes(user.rol);
  const canViewContrato = user.rol === "admin" || user.rol === "lider";
  const canManageDrive = canViewContrato;

  const { data: driveFolderData } = await supabase
    .from("boda_drive_folders")
    .select("folder_url")
    .eq("boda_id", id)
    .maybeSingle();

  const driveFolderUrl =
    (driveFolderData as { folder_url: string | null } | null)?.folder_url ?? null;

  const isAdmin = isAdminRole(user.rol);
  const revertBodaPayload = {
    id,
    lead_id: bodaRow.lead_id,
    nombre_pareja: bodaRow.nombre_pareja,
    fecha_boda: bodaRow.fecha_boda,
    ciudad: bodaRow.ciudad,
    telefono_novia: bodaRow.telefono_novia,
    email_novia: bodaRow.email_novia,
    honorarios: bodaRow.honorarios,
    anticipo_honorarios: bodaRow.anticipo_honorarios,
    lugar_venue: bodaRow.lugar_venue,
  };

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          <ChevronLeftIcon />
          Volver al dashboard
        </Link>

        <header className="mt-6">
          <h1 className="font-display text-3xl text-bloom-ink">
            {bodaRow.nombre_pareja}
          </h1>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <dt className="text-bloom-muted">Fecha</dt>
              <dd>
                <BodaFechaConfirmada
                  bodaId={id}
                  boda={{
                    fecha_boda: bodaRow.fecha_boda,
                    fecha_confirmada: bodaRow.fecha_confirmada ?? false,
                    google_event_id_fecha: bodaRow.google_event_id_fecha,
                    fecha_boda_confirmada: bodaRow.fecha_boda_confirmada,
                  }}
                  role={user.rol}
                />
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-bloom-muted">Ciudad</dt>
              <dd className="font-medium text-bloom-ink">{bodaRow.ciudad}</dd>
            </div>
            <BodaNumInvitados
              bodaId={id}
              numInvitados={bodaRow.num_invitados}
              role={user.rol}
            />
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            {hasPermission(user.rol, "whatsapp.send") && (
              <>
                <ShareWithClientButton bodaId={id} />
                <ClientePortalQrButton bodaId={id} />
              </>
            )}
            {bodaRow.lead_id && (
              <BodaCotizacionInicialButton leadId={bodaRow.lead_id} />
            )}
            {isAdmin && <RevertirALeadButton boda={revertBodaPayload} />}
          </div>
        </header>

        <BodaDetailSections
          bodaId={id}
          boda={bodaRow}
          role={user.rol}
          plannerName={user.nombre}
          currentUserId={user.id}
          providers={providers}
          pagosByProveedor={pagosByProveedor}
          notas={notas}
          notasReunion={notasReunion}
          tastings={tastings}
          proveedoresSugeridos={proveedoresSugeridos}
          detallesCelebracion={detallesCelebracion}
          brief={brief}
          contrato={contrato}
          citas={(citasData ?? []) as CitaRow[]}
          bodasLookup={bodasLookup ?? []}
          leadsLookup={leadsLookup ?? []}
          equipo={equipo}
          equipoCitas={equipoCitas}
          canViewBrief={canViewBrief}
          canViewContrato={canViewContrato}
          hasCronograma={(cronogramaCount ?? 0) > 0}
          hasClientInfo={hasClientInfoContent(bodaRow)}
          hasBrief={hasBriefContent(brief)}
          hasContrato={hasContratoContent(contrato, bodaRow)}
          openSection={openSection}
          highlightProveedorId={highlightProveedorId}
          canManageDrive={canManageDrive}
          driveFolderUrl={driveFolderUrl}
        />

        {hasPermission(user.rol, "weddings.delete") && (
          <div className="mt-12 border-t border-bloom-border pt-8">
            <DeleteWeddingButton
              bodaId={id}
              bodaNombre={bodaRow.nombre_pareja}
            />
          </div>
        )}
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
