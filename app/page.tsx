import Link from "next/link";
import { CronogramaAlertsSection } from "./components/CronogramaAlertsSection";
import { BodaInactivityAlertsSection } from "./components/BodaInactivityAlertsSection";
import { LeadAlertsSection } from "./components/LeadAlertsSection";
import { LeadsBoard } from "./components/LeadsBoard";
import { CitasHoySection } from "./components/citas/CitasHoySection";
import { PaymentAlertsSection } from "./components/PaymentAlertsSection";
import { TastingPaymentAlertsSection } from "./components/TastingPaymentAlertsSection";
import { DashboardHeader } from "./components/DashboardHeader";
import { ExportarDatosButton } from "./components/ExportarDatosButton";
import { DashboardWeddingsRealtime } from "./components/DashboardWeddingsRealtime";
import { NewWeddingModalButton } from "./components/NewWeddingModalButton";
import { buildBodaInactivityAlerts } from "./data/boda-alerts";
import { buildCronogramaAlerts } from "./data/cronograma-alerts";
import { buildLeadInactivityAlerts } from "./data/lead-alerts";
import { buildPaymentAlerts } from "./data/payment-alerts";
import { buildTastingPaymentAlerts } from "./data/tasting-payment-alerts";
import type { LeadRow } from "./data/leads";
import {
  normalizeLeadRow,
  partitionLeadsForDashboard,
} from "@/lib/leads-dashboard";
import type { CitaRow } from "./data/citas";
import type { ProveedorRow } from "./data/providers";
import {
  normalizeTareaRow,
  type TareaRow,
} from "./data/tareas";
import { mapBodaToWedding, buildProviderCountsByBoda, type BodaRow } from "./data/weddings";
import { MisTareasPendientesSection } from "./components/tareas/MisTareasPendientesSection";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canViewLeads, hasPermission } from "@/lib/auth/roles";
import { isBodaActiva, isBodaFinalizada } from "@/lib/boda-estado";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const wantsLeadsTab = resolvedSearchParams?.tab === "leads";
  const showLeads = canViewLeads(user.rol);

  if (wantsLeadsTab && !showLeads) {
    redirect("/");
  }

  const tab = wantsLeadsTab && showLeads ? "leads" : "bodas";

  let activeWeddings: Array<
    ReturnType<typeof mapBodaToWedding> & {
      brideName: string | null;
      groomName: string | null;
    }
  > = [];
  let finishedWeddings: ReturnType<typeof mapBodaToWedding>[] = [];
  let bodaRows: BodaRow[] = [];
  let activeLeads: LeadRow[] = [];
  let discardedLeads: LeadRow[] = [];
  let allLeads: LeadRow[] = [];
  let paymentAlerts: ReturnType<typeof buildPaymentAlerts> = [];
  let cronogramaAlerts: ReturnType<typeof buildCronogramaAlerts> = [];
  let leadInactivityAlerts: ReturnType<typeof buildLeadInactivityAlerts> = [];
  let bodaInactivityAlerts: ReturnType<typeof buildBodaInactivityAlerts> = [];
  let tastingPaymentAlerts: ReturnType<typeof buildTastingPaymentAlerts> = [];
  let citasHoy: CitaRow[] = [];
  let misTareas: TareaRow[] = [];
  let tareasCompletadasRecientes: TareaRow[] = [];
  let nombresByUsername: Record<string, string> = {};

  const { data: bodasData, error: bodasError } = await supabase
    .from("bodas")
    .select("*")
    .order("fecha_boda", { ascending: true });

  if (bodasError) {
    console.error(bodasError);
  } else if (bodasData) {
    bodaRows = bodasData as BodaRow[];
    const activeBodaRows = bodaRows.filter((boda) => isBodaActiva(boda.estado));
    const finishedBodaRows = bodaRows.filter((boda) =>
      isBodaFinalizada(boda.estado),
    );

    const bodaIdsForCounts = [
      ...activeBodaRows.map((boda) => boda.id),
      ...finishedBodaRows.map((boda) => boda.id),
    ];

    let providerCountsByBoda = new Map<
      string,
      { contracted: number; total: number }
    >();
    let providerCountsLoaded = false;

    if (bodaIdsForCounts.length > 0) {
      const { data: proveedoresCountData, error: proveedoresCountError } =
        await supabase
          .from("proveedores")
          .select("boda_id, estado")
          .in("boda_id", bodaIdsForCounts);

      if (proveedoresCountError) {
        console.error(proveedoresCountError);
      } else {
        providerCountsLoaded = true;
        providerCountsByBoda = buildProviderCountsByBoda(
          (proveedoresCountData ?? []) as Array<{
            boda_id: string;
            estado: string;
          }>,
        );
      }
    }

    activeWeddings = activeBodaRows.map((row) => ({
      ...mapBodaToWedding(
        row,
        providerCountsLoaded
          ? (providerCountsByBoda.get(row.id) ?? { contracted: 0, total: 0 })
          : undefined,
      ),
      brideName: row.nombre_novia,
      groomName: row.nombre_novio,
    }));
    finishedWeddings = finishedBodaRows.map((row) =>
      mapBodaToWedding(
        row,
        providerCountsLoaded
          ? (providerCountsByBoda.get(row.id) ?? { contracted: 0, total: 0 })
          : undefined,
      ),
    );
    bodaInactivityAlerts = buildBodaInactivityAlerts(bodaRows);
  }

  const activeBodaIds = new Set(
    bodaRows.filter((boda) => isBodaActiva(boda.estado)).map((boda) => boda.id),
  );

  function filterAlertsByActiveBodas<T extends { bodaId: string }>(
    alerts: T[],
  ) {
    if (activeBodaIds.size === 0) return [];
    return alerts.filter((alert) => activeBodaIds.has(alert.bodaId));
  }

  if (showLeads) {
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (leadsError) {
      console.error(leadsError);
    } else if (leadsData) {
      const { data: bodasConLead } = await supabase
        .from("bodas")
        .select("lead_id")
        .not("lead_id", "is", null);

      const convertedLeadIds = new Set(
        (bodasConLead ?? [])
          .map((b) => b.lead_id as string)
          .filter(Boolean),
      );

      allLeads = (leadsData as Record<string, unknown>[]).map(normalizeLeadRow);
      const partitioned = partitionLeadsForDashboard(allLeads, convertedLeadIds);
      activeLeads = partitioned.activeLeads;
      discardedLeads = partitioned.discardedLeads;
      leadInactivityAlerts = buildLeadInactivityAlerts(activeLeads);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const maxDate = in30Days.toISOString().slice(0, 10);

  const { data: proveedoresData, error: proveedoresError } = await supabase
    .from("proveedores")
    .select("*, bodas(nombre_pareja, whatsapp_grupo_link, telefono_novia)")
    .not("fecha_saldo", "is", null)
    .gte("fecha_saldo", today)
    .lte("fecha_saldo", maxDate);

  if (proveedoresError) {
    console.error(proveedoresError);
  } else if (proveedoresData) {
    paymentAlerts = filterAlertsByActiveBodas(
      buildPaymentAlerts(
        proveedoresData as Parameters<typeof buildPaymentAlerts>[0],
      ),
    );
  }

  const { data: cronogramaItemsData, error: cronogramaItemsError } =
    await supabase
      .from("cronograma_items")
      .select("id, boda_id, descripcion, fecha_limite, completado, bodas(nombre_pareja)")
      .eq("completado", false)
      .or(`fecha_limite.lt.${today},and(fecha_limite.gte.${today},fecha_limite.lte.${maxDate})`)
      .order("fecha_limite", { ascending: true });

  if (cronogramaItemsError) {
    console.error(cronogramaItemsError);
  } else if (cronogramaItemsData) {
    cronogramaAlerts = filterAlertsByActiveBodas(
      buildCronogramaAlerts(
        cronogramaItemsData as {
          id: string;
          boda_id: string;
          descripcion: string;
          fecha_limite: string;
          completado: boolean;
          bodas: { nombre_pareja: string } | { nombre_pareja: string }[] | null;
        }[],
      ),
    );
  }

  const { data: citasHoyData, error: citasHoyError } = await supabase
    .from("citas")
    .select("*")
    .eq("fecha", today)
    .order("hora_inicio", { ascending: true });

  if (citasHoyError) {
    console.error(citasHoyError);
  } else if (citasHoyData) {
    citasHoy = citasHoyData as CitaRow[];
  }

  const { data: tareasData, error: tareasError } = await supabase
    .from("tareas")
    .select("*")
    .eq("asignado_a", user.username)
    .eq("completada", false);

  if (tareasError) {
    console.error(tareasError);
  } else if (tareasData) {
    misTareas = (tareasData as TareaRow[]).map(normalizeTareaRow);
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: tareasCompletadasData, error: tareasCompletadasError } =
    await supabase
      .from("tareas")
      .select("*")
      .eq("creado_por", user.username)
      .eq("completada", true)
      .gte("completada_at", since24h)
      .order("completada_at", { ascending: false });

  if (tareasCompletadasError) {
    // Fallback si aún no existe la columna completada_at en Supabase.
    console.error(tareasCompletadasError);
    const { data: fallbackData } = await supabase
      .from("tareas")
      .select("*")
      .eq("creado_por", user.username)
      .eq("completada", true)
      .gte("updated_at", since24h)
      .order("updated_at", { ascending: false });

    if (fallbackData) {
      tareasCompletadasRecientes = (fallbackData as TareaRow[]).map(
        normalizeTareaRow,
      );
    }
  } else if (tareasCompletadasData) {
    tareasCompletadasRecientes = (tareasCompletadasData as TareaRow[]).map(
      normalizeTareaRow,
    );
  }

  const { data: perfilesData } = await supabase
    .from("user_profiles")
    .select("username, nombre")
    .eq("activo", true);

  if (perfilesData) {
    nombresByUsername = Object.fromEntries(
      perfilesData.map((perfil) => [
        perfil.username as string,
        perfil.nombre as string,
      ]),
    );
  }

  const { data: unpaidTastingsData, error: unpaidTastingsError } =
    await supabase
      .from("tastings")
      .select(
        "id, boda_id, fecha, hora_inicio, proveedor_id, nombre_proveedor, costo, bodas(nombre_pareja)",
      )
      .eq("prueba_pagada", false)
      .gt("costo", 0)
      .order("fecha", { ascending: true });

  if (unpaidTastingsError) {
    console.error(unpaidTastingsError);
  } else if (unpaidTastingsData) {
    tastingPaymentAlerts = filterAlertsByActiveBodas(
      buildTastingPaymentAlerts(
        unpaidTastingsData as Parameters<typeof buildTastingPaymentAlerts>[0],
      ),
    );
  }

  // Nombres de leads solo para citas del día (sin exponer el módulo de leads).
  if (!showLeads) {
    const leadIdsForCitas = [
      ...new Set(
        citasHoy
          .map((c) => c.lead_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (leadIdsForCitas.length > 0) {
      const { data: leadsCitasData } = await supabase
        .from("leads")
        .select("id, nombre_pareja")
        .in("id", leadIdsForCitas);
      allLeads = (leadsCitasData ?? []).map((l) =>
        normalizeLeadRow(l as Record<string, unknown>),
      );
    }
  }

  const bodasById = Object.fromEntries(
    ((bodasData ?? []) as BodaRow[]).map((b) => [
      b.id,
      {
        nombre_pareja: b.nombre_pareja,
        telefono_novia: b.telefono_novia,
        telefono_novio: b.telefono_novio,
        whatsapp_grupo_link: b.whatsapp_grupo_link,
      },
    ]),
  );
  const leadsById = Object.fromEntries(
    allLeads.map((l) => [l.id, { nombre_pareja: l.nombre_pareja }]),
  );

  const proveedorIds = [
    ...new Set(
      citasHoy
        .map((c) => c.proveedor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let proveedoresById: Record<
    string,
    { nombre: string; telefono: string | null }
  > = {};

  if (proveedorIds.length > 0) {
    const { data: proveedoresCitasData, error: proveedoresCitasError } =
      await supabase
        .from("proveedores")
        .select("id, nombre, telefono")
        .in("id", proveedorIds);

    if (proveedoresCitasError) {
      console.error(proveedoresCitasError);
    } else if (proveedoresCitasData) {
      proveedoresById = Object.fromEntries(
        proveedoresCitasData.map((p) => [
          p.id,
          { nombre: p.nombre, telefono: p.telefono },
        ]),
      );
    }
  }

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6 sm:py-10 md:px-8">
        {user.rol === "admin" && (
          <div className="flex justify-end">
            <ExportarDatosButton />
          </div>
        )}

        <CitasHoySection
          citas={citasHoy}
          context={{ bodasById, leadsById, proveedoresById }}
        />
        <MisTareasPendientesSection
          tareasPendientes={misTareas}
          tareasCompletadasRecientes={tareasCompletadasRecientes}
          username={user.username}
          bodaNombresById={Object.fromEntries(
            bodaRows.map((boda) => [boda.id, boda.nombre_pareja]),
          )}
          nombresByUsername={nombresByUsername}
        />
        <PaymentAlertsSection
          alerts={paymentAlerts}
          canSendWhatsApp={hasPermission(user.rol, "whatsapp.send")}
        />
        <TastingPaymentAlertsSection alerts={tastingPaymentAlerts} />
        <CronogramaAlertsSection alerts={cronogramaAlerts} />
        <BodaInactivityAlertsSection alerts={bodaInactivityAlerts} />
        {showLeads && (
          <LeadAlertsSection alerts={leadInactivityAlerts} />
        )}

        <div className="inline-flex rounded-full border border-bloom-border bg-bloom-surface p-1">
          <Link
            href="/?tab=bodas"
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === "bodas"
                ? "bg-bloom-accent text-white"
                : "text-bloom-ink hover:bg-bloom-border"
            }`}
          >
            Bodas
          </Link>
          {showLeads && (
            <Link
              href="/?tab=leads"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === "leads"
                  ? "bg-bloom-accent text-white"
                  : "text-bloom-ink hover:bg-bloom-border"
              }`}
            >
              Leads
            </Link>
          )}
          <Link
            href="/directorio"
            className="rounded-full px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
          >
            Directorio
          </Link>
          <Link
            href="/calendario"
            className="rounded-full px-4 py-2 text-sm font-medium text-bloom-ink transition-colors hover:bg-bloom-border"
          >
            Calendario
          </Link>
        </div>

        {tab === "bodas" ? (
          <DashboardWeddingsRealtime
            initialActive={activeWeddings}
            initialFinished={finishedWeddings}
            newWeddingButton={
              hasPermission(user.rol, "weddings.create") ? (
                <NewWeddingModalButton />
              ) : undefined
            }
          />
        ) : (
          <LeadsBoard
            activeLeads={activeLeads}
            discardedLeads={discardedLeads}
            role={user.rol}
          />
        )}
      </main>
    </div>
  );
}
