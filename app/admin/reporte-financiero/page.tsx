import Link from "next/link";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import type { LeadRow } from "@/app/data/leads";
import type { BodaRow } from "@/app/data/weddings";
import { requireAdminUser } from "@/lib/auth/user-profiles";
import {
  buildReporteFinancieroData,
  type ReporteFinancieroProveedor,
} from "@/lib/reporte-financiero";
import { normalizeLeadRow } from "@/lib/leads-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ReporteFinancieroClient } from "./ReporteFinancieroClient";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ year?: string }>;
};

export default async function ReporteFinancieroPage({ searchParams }: PageProps) {
  const user = await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentYear = new Date().getFullYear();
  const parsedYear = Number(resolvedSearchParams?.year);
  const year =
    Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
      ? parsedYear
      : currentYear;

  const [{ data: bodasData }, { data: leadsData }, { data: proveedoresData }] =
    await Promise.all([
      supabase
        .from("bodas")
        .select(
          "id, nombre_pareja, fecha_boda, honorarios, anticipo_honorarios, lead_id, created_at",
        )
        .order("fecha_boda", { ascending: false }),
      supabase.from("leads").select("*").order("created_at", { ascending: false }),
      supabase
        .from("proveedores")
        .select("*, bodas(id, nombre_pareja, fecha_boda)")
        .eq("estado", "contratado")
        .eq("da_comision", true),
    ]);

  const bodas = (bodasData ?? []) as BodaRow[];
  const leads = (leadsData ?? []).map((row) =>
    normalizeLeadRow(row as Record<string, unknown>),
  ) as LeadRow[];
  const proveedores = (proveedoresData ?? []) as ReporteFinancieroProveedor[];

  const reporte = buildReporteFinancieroData(year, bodas, leads, proveedores);

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <DashboardHeader user={user} />
      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-bloom-muted transition-colors hover:text-bloom-ink"
        >
          ← Volver
        </Link>

        <header className="mt-6">
          <h1 className="font-display text-3xl text-bloom-ink">
            Reporte financiero
          </h1>
          <p className="mt-1 text-sm text-bloom-muted">
            Métricas de ingresos, comisiones y conversión para {year}.
          </p>
        </header>

        <div className="mt-8">
          <ReporteFinancieroClient data={reporte} />
        </div>
      </main>
    </div>
  );
}
