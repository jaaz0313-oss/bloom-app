import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardHeader } from "@/app/components/DashboardHeader";
import { AddProviderModalButton } from "@/app/components/bodas/AddProviderModalButton";
import { ClientInfoSection } from "@/app/components/bodas/ClientInfoSection";
import { DeleteWeddingButton } from "@/app/components/bodas/DeleteWeddingButton";
import { ShareWithClientButton } from "@/app/components/bodas/ShareWithClientButton";
import { PaymentProjection } from "@/app/components/bodas/PaymentProjection";
import { CronogramaContratacion } from "@/app/components/CronogramaContratacion";
import { NotasInternas } from "@/app/components/bodas/NotasInternas";
import { ProviderList } from "@/app/components/bodas/ProviderList";
import type { NotaBodaRow } from "@/app/data/notas-boda";
import type { BodaRow } from "@/app/data/weddings";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import {
  computePaymentProjection,
  type ProveedorRow,
} from "@/app/data/providers";
import { formatWeddingDate } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { requireAuthUser } from "@/lib/auth/user-profiles";
import { hasPermission } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BodaDetailPage({ params }: PageProps) {
  const user = await requireAuthUser();
  const supabase = await createServerSupabaseClient();
  const { id } = await params;

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

  const projection = computePaymentProjection(providers, pagosByProveedor);

  const { data: notasData, error: notasError } = await supabase
    .from("notas_boda")
    .select("*")
    .eq("boda_id", id)
    .order("created_at", { ascending: false });

  if (notasError) {
    console.error(notasError);
  }

  const notas = (notasData ?? []) as NotaBodaRow[];

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
            <div className="flex gap-2">
              <dt className="text-bloom-muted">Fecha</dt>
              <dd className="font-medium text-bloom-ink">
                {formatWeddingDate(bodaRow.fecha_boda)}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-bloom-muted">Ciudad</dt>
              <dd className="font-medium text-bloom-ink">{bodaRow.ciudad}</dd>
            </div>
          </dl>
          <div className="mt-4">
            {hasPermission(user.rol, "whatsapp.send") && (
              <ShareWithClientButton bodaId={id} />
            )}
          </div>
        </header>

        <div className="mt-8 space-y-8">
          <ClientInfoSection
            bodaId={id}
            boda={bodaRow}
            role={user.rol}
            plannerName={user.nombre}
            providers={providers}
            pagosByProveedor={pagosByProveedor}
          />

          <NotasInternas
            bodaId={id}
            initialNotas={notas}
            currentUserId={user.id}
            currentUserNombre={user.nombre}
            role={user.rol}
          />

          <PaymentProjection
            totalContratado={projection.totalContratado}
            totalPagado={projection.totalPagado}
            saldoPendiente={projection.saldoPendiente}
          />

          <section>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl text-bloom-ink">
                  Proveedores
                </h2>
                <p className="mt-1 text-sm text-bloom-muted">
                  {providers.length}{" "}
                  {providers.length === 1 ? "proveedor" : "proveedores"}{" "}
                  registrados
                </p>
              </div>
              {hasPermission(user.rol, "providers.manage") && (
                <AddProviderModalButton
                  bodaId={id}
                  bodaNombre={bodaRow.nombre_pareja}
                  role={user.rol}
                />
              )}
            </div>

            <div className="mt-5">
              <ProviderList
                providers={providers}
                bodaId={id}
                boda={{
                  nombrePareja: bodaRow.nombre_pareja,
                  fechaBoda: bodaRow.fecha_boda,
                  ciudad: bodaRow.ciudad,
                }}
                plannerName={user.nombre}
                pagosByProveedor={pagosByProveedor}
                role={user.rol}
                whatsappGrupoLink={bodaRow.whatsapp_grupo_link}
              />
            </div>
          </section>

          <CronogramaContratacion
            bodaId={id}
            fechaBoda={bodaRow.fecha_boda}
            canManage={hasPermission(user.rol, "cronograma.manage")}
          />
        </div>

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
