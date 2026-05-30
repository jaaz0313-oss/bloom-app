import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { CitasSection } from "@/app/components/citas/CitasSection";
import { LeadCotizacionesSection } from "@/app/components/leads/LeadCotizacionesSection";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_STYLES,
  type LeadRow,
} from "@/app/data/leads";
import type { CitaRow } from "@/app/data/citas";
import type { CotizacionRow } from "@/app/data/cotizaciones";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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

  const leadRow = lead as LeadRow;

  const { data: cotizaciones } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false });

  const { data: citasData } = await supabase
    .from("citas")
    .select("*")
    .eq("lead_id", id)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const { data: bodasLookup } = await supabase
    .from("bodas")
    .select(
      "id, nombre_pareja, telefono_novia, telefono_novio, email_novia, email_novio",
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
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLES[leadRow.estado]}`}
            >
              {LEAD_STATUS_LABELS[leadRow.estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-bloom-muted">
            {leadRow.ciudad} · {formatShortDate(leadRow.fecha_tentativa)}
          </p>
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

        <LeadCotizacionesSection
          lead={leadRow}
          cotizaciones={(cotizaciones ?? []) as CotizacionRow[]}
        />
      </main>
    </div>
  );
}
