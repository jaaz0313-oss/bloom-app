import Link from "next/link";
import { CronogramaAlertsSection } from "./components/CronogramaAlertsSection";
import { LeadsBoard } from "./components/LeadsBoard";
import { CitasHoySection } from "./components/citas/CitasHoySection";
import { PaymentAlertsSection } from "./components/PaymentAlertsSection";
import { DashboardHeader } from "./components/DashboardHeader";
import { WeddingCard } from "./components/WeddingCard";
import { NewWeddingModalButton } from "./components/NewWeddingModalButton";
import { buildCronogramaAlerts } from "./data/cronograma-alerts";
import { buildPaymentAlerts } from "./data/payment-alerts";
import type { LeadRow } from "./data/leads";
import type { CitaRow } from "./data/citas";
import type { ProveedorRow } from "./data/providers";
import { mapBodaToWedding, type BodaRow } from "./data/weddings";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { hasPermission } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const tab = resolvedSearchParams?.tab === "leads" ? "leads" : "bodas";

  let activeWeddings: ReturnType<typeof mapBodaToWedding>[] = [];
  let leads: LeadRow[] = [];
  let paymentAlerts: ReturnType<typeof buildPaymentAlerts> = [];
  let cronogramaAlerts: ReturnType<typeof buildCronogramaAlerts> = [];
  let citasHoy: CitaRow[] = [];

  const { data: bodasData, error: bodasError } = await supabase
    .from("bodas")
    .select("*")
    .order("fecha_boda", { ascending: true });

  if (bodasError) {
    console.error(bodasError);
  } else if (bodasData) {
    activeWeddings = (bodasData as BodaRow[]).map(mapBodaToWedding);
  }

  const { data: leadsData, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (leadsError) {
    console.error(leadsError);
  } else if (leadsData) {
    leads = leadsData as LeadRow[];
  }

  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const maxDate = in30Days.toISOString().slice(0, 10);

  const { data: proveedoresData, error: proveedoresError } = await supabase
    .from("proveedores")
    .select("*, bodas(nombre_pareja)")
    .not("fecha_saldo", "is", null)
    .gte("fecha_saldo", today)
    .lte("fecha_saldo", maxDate);

  if (proveedoresError) {
    console.error(proveedoresError);
  } else if (proveedoresData) {
    paymentAlerts = buildPaymentAlerts(
      proveedoresData as (ProveedorRow & {
        bodas: { nombre_pareja: string } | null;
      })[],
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
    cronogramaAlerts = buildCronogramaAlerts(
      cronogramaItemsData as {
        id: string;
        boda_id: string;
        descripcion: string;
        fecha_limite: string;
        completado: boolean;
        bodas: { nombre_pareja: string } | { nombre_pareja: string }[] | null;
      }[],
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

  const bodasById = Object.fromEntries(
    ((bodasData ?? []) as BodaRow[]).map((b) => [
      b.id,
      { nombre_pareja: b.nombre_pareja },
    ]),
  );
  const leadsById = Object.fromEntries(
    leads.map((l) => [l.id, { nombre_pareja: l.nombre_pareja }]),
  );

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <PaymentAlertsSection alerts={paymentAlerts} />
        <CronogramaAlertsSection alerts={cronogramaAlerts} />
        <CitasHoySection
          citas={citasHoy}
          bodasById={bodasById}
          leadsById={leadsById}
        />

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
          <>
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-display text-3xl text-bloom-ink">
                  Bodas activas
                </h1>
                <p className="mt-1 text-bloom-muted">
                  {activeWeddings.length}{" "}
                  {activeWeddings.length === 1 ? "boda" : "bodas"} en curso
                </p>
              </div>

              {hasPermission(user.rol, "weddings.create") && <NewWeddingModalButton />}
            </div>

            <ul className="mt-8 space-y-4">
              {activeWeddings.map((wedding) => (
                <li key={wedding.id}>
                  <WeddingCard wedding={wedding} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <LeadsBoard leads={leads} role={user.rol} />
        )}
      </main>
    </div>
  );
}
