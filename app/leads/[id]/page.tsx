import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { CitasSection } from "@/app/components/citas/CitasSection";
import { LeadCotizacionesSection } from "@/app/components/leads/LeadCotizacionesSection";
import { LeadCotizacionPanel } from "@/app/components/leads/LeadCotizacionPanel";
import { LeadSugerenciasBodasSimilares } from "@/app/components/leads/LeadSugerenciasBodasSimilares";
import { LeadAgendarReunionButton } from "@/app/components/leads/LeadAgendarReunionModal";
import type { CotizacionItemRow } from "@/app/data/cotizaciones";
import { pickActiveLeadCotizacion } from "@/lib/lead-cotizacion";
import { buildHistoricoPrecios } from "@/lib/cotizacion-historico";
import { normalizeLeadRow } from "@/lib/leads-dashboard";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import {
  LEAD_SEGUIMIENTO_LABELS,
  LEAD_SEGUIMIENTO_STYLES,
} from "@/app/data/leads";
import type { CitaRow } from "@/app/data/citas";
import type { CotizacionRow } from "@/app/data/cotizaciones";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canManageBodaEstado } from "@/lib/auth/roles";
import {
  fetchSugerenciasBodasSimilares,
  type SugerenciasBodasSimilaresResult,
} from "@/lib/sugerencias-bodas-similares";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function LeadDetailPage({ params }: PageProps) {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();
  const { id } = await params;

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (leadError || !lead) {
    notFound();
  }

  const leadRow = normalizeLeadRow(lead as Record<string, unknown>);

  const { data: cotizacionesData } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const cotizaciones = (cotizacionesData ?? []) as CotizacionRow[];
  const activeCotizacion = pickActiveLeadCotizacion(cotizaciones);

  let cotizacionItems: CotizacionItemRow[] = [];
  let directorio: DirectorioProveedorRow[] = [];
  let historico: ReturnType<typeof buildHistoricoPrecios> = [];

  if (activeCotizacion) {
    const [{ data: itemsData }, { data: directorioData }, { data: proveedoresHistorico }, { data: itemsHistorico }] =
      await Promise.all([
        supabase
          .from("cotizacion_items")
          .select("*")
          .eq("cotizacion_id", activeCotizacion.id)
          .order("categoria", { ascending: true }),
        supabase
          .from("directorio_proveedores")
          .select("*")
          .eq("activo", true)
          .order("nombre", { ascending: true }),
        supabase
          .from("proveedores")
          .select("categoria, valor_total")
          .eq("estado", "contratado")
          .gt("valor_total", 0),
        supabase
          .from("cotizacion_items")
          .select(
            "categoria, precio_estimado, incluido, cotizaciones(numero_invitados)",
          )
          .eq("incluido", true)
          .neq("cotizacion_id", activeCotizacion.id),
      ]);

    cotizacionItems = (itemsData ?? []) as CotizacionItemRow[];
    directorio = (directorioData ?? []) as DirectorioProveedorRow[];
    historico = buildHistoricoPrecios(
      (proveedoresHistorico ?? []) as { categoria: string; valor_total: number }[],
      (itemsHistorico ?? []) as Parameters<typeof buildHistoricoPrecios>[1],
    );
  }

  const { data: citasData } = await supabase
    .from("citas")
    .select("*")
    .eq("lead_id", id)
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

  const { data: equipoData } = await supabase
    .from("user_profiles")
    .select("id, nombre, username, email")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  const canViewSugerencias = canManageBodaEstado(user.rol);
  let sugerenciasBodasSimilares: SugerenciasBodasSimilaresResult | null = null;
  if (canViewSugerencias) {
    sugerenciasBodasSimilares = await fetchSugerenciasBodasSimilares(
      supabase,
      leadRow,
    );
  }

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <Link
          href="/?tab=leads"
          className="text-sm font-medium text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          ← Volver a leads
        </Link>

        <header className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl text-bloom-ink">
              {leadRow.nombre_pareja}
            </h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_SEGUIMIENTO_STYLES[leadRow.estado_seguimiento]}`}
            >
              {LEAD_SEGUIMIENTO_LABELS[leadRow.estado_seguimiento]}
            </span>
          </div>
          <p className="mt-1 text-sm text-bloom-muted">
            {[
              leadRow.ciudad?.trim() || null,
              leadRow.fecha_tentativa
                ? formatShortDate(leadRow.fecha_tentativa)
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sin fecha ni ciudad"}
          </p>
          <div className="mt-4">
            <LeadAgendarReunionButton
              lead={leadRow}
              role={user.rol}
              currentUserId={user.id}
              currentUserNombre={user.nombre}
              className="rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
            />
          </div>
        </header>

        <dl className="mt-6 grid gap-3 rounded-2xl border border-bloom-border bg-bloom-surface p-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-bloom-muted">Invitados</dt>
            <dd className="font-medium text-bloom-ink">
              {leadRow.cantidad_invitados ?? "No definido"}
            </dd>
          </div>
          <div>
            <dt className="text-bloom-muted">Presupuesto estimado</dt>
            <dd className="font-medium text-bloom-ink">
              {leadRow.presupuesto_estimado == null
                ? "No definido"
                : formatCurrency(leadRow.presupuesto_estimado)}
            </dd>
          </div>
          <div>
            <dt className="text-bloom-muted">Teléfono</dt>
            <dd className="font-medium text-bloom-ink">
              {leadRow.telefono ? (
                <a
                  href={`tel:${leadRow.telefono}`}
                  className="text-bloom-accent hover:underline"
                >
                  {leadRow.telefono}
                </a>
              ) : (
                "No registrado"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-bloom-muted">Email</dt>
            <dd className="font-medium text-bloom-ink">
              {leadRow.email ? (
                <a
                  href={`mailto:${leadRow.email}`}
                  className="text-bloom-accent hover:underline"
                >
                  {leadRow.email}
                </a>
              ) : (
                "No registrado"
              )}
            </dd>
          </div>
          {leadRow.tipo_ceremonia && (
            <div>
              <dt className="text-bloom-muted">Tipo de ceremonia</dt>
              <dd className="font-medium text-bloom-ink">
                {leadRow.tipo_ceremonia}
              </dd>
            </div>
          )}
          {leadRow.notas && (
            <div className="sm:col-span-2">
              <dt className="text-bloom-muted">Notas</dt>
              <dd className="whitespace-pre-wrap text-bloom-ink">
                {leadRow.notas}
              </dd>
            </div>
          )}
        </dl>

        {activeCotizacion && (
          <LeadCotizacionPanel
            lead={leadRow}
            cotizacion={activeCotizacion}
            items={cotizacionItems}
            directorio={directorio}
            historico={historico}
          />
        )}

        {sugerenciasBodasSimilares && (
          <LeadSugerenciasBodasSimilares result={sugerenciasBodasSimilares} />
        )}

        <CitasSection
          initialCitas={(citasData ?? []) as CitaRow[]}
          bodas={bodasLookup ?? []}
          leads={leadsLookup ?? []}
          equipo={equipoData ?? []}
          role={user.rol}
          currentUserId={user.id}
          currentUserNombre={user.nombre}
          defaultLeadId={id}
        />

        <LeadCotizacionesSection lead={leadRow} cotizaciones={cotizaciones} />
      </main>
    </div>
  );
}
