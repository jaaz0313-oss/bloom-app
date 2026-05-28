import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BodaRow } from "@/app/data/weddings";
import {
  computePaymentProjection,
  getProviderSaldoPendienteConPagos,
  type ProveedorRow,
} from "@/app/data/providers";
import { groupPagosByProveedor, type PagoRow } from "@/app/data/pagos";
import { formatCurrency, formatShortDate, formatWeddingDate } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("bodas")
    .select("nombre_pareja")
    .eq("id", id)
    .maybeSingle();

  const nombre = (data as { nombre_pareja: string } | null)?.nombre_pareja;

  return {
    title: nombre ? `${nombre} — Bloom` : "Resumen de boda — Bloom",
    description: "Resumen de proveedores contratados y pagos pendientes para tu boda.",
  };
}

export default async function ClienteBodaPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: boda, error: bodaError } = await supabase
    .from("bodas")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (bodaError || !boda) {
    notFound();
  }

  const bodaRow = boda as BodaRow;

  const { data: proveedores } = await supabase
    .from("proveedores")
    .select("*")
    .eq("boda_id", id)
    .eq("estado", "contratado")
    .order("categoria", { ascending: true });

  const contratados = (proveedores ?? []) as ProveedorRow[];
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

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <header className="border-b border-bloom-border bg-bloom-surface">
        <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">
          <h1 className="font-display text-3xl uppercase tracking-wide text-bloom-ink sm:text-4xl">
            {bodaRow.nombre_pareja}
          </h1>
          <p className="mt-2 text-base text-bloom-muted sm:text-lg">
            {formatWeddingDate(bodaRow.fecha_boda)}
            {bodaRow.ciudad ? ` · ${bodaRow.ciudad}` : ""}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-8">
        <section className="rounded-2xl border border-bloom-border bg-bloom-surface p-6 shadow-sm">
          <h2 className="font-display text-xl text-bloom-ink">Proyección de pagos</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-bloom-border bg-bloom-canvas/60 p-4">
              <dt className="text-sm text-bloom-muted">Total contratado</dt>
              <dd className="mt-1 text-xl font-semibold text-bloom-ink">
                {formatCurrency(totalContratado)}
              </dd>
            </div>
            <div className="rounded-xl border border-bloom-border bg-bloom-canvas/60 p-4">
              <dt className="text-sm text-bloom-muted">Total pagado</dt>
              <dd className="mt-1 text-xl font-semibold text-bloom-success">
                {formatCurrency(totalPagado)}
              </dd>
            </div>
            <div className="rounded-xl border border-bloom-border bg-bloom-canvas/60 p-4">
              <dt className="text-sm text-bloom-muted">Saldo pendiente</dt>
              <dd className="mt-1 text-xl font-semibold text-bloom-ink">
                {formatCurrency(saldoPendiente)}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="font-display text-xl text-bloom-ink">
            Proveedores contratados
          </h2>
          <p className="mt-1 text-sm text-bloom-muted">
            {contratados.length}{" "}
            {contratados.length === 1 ? "proveedor" : "proveedores"}
          </p>

          {contratados.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-10 text-center text-sm text-bloom-muted">
              Aún no hay proveedores contratados para mostrar.
            </p>
          ) : (
            <ul className="mt-6 space-y-5">
              {contratados.map((provider) => {
                const pagos = pagosByProveedor[provider.id] ?? [];
                const saldo = getProviderSaldoPendienteConPagos(provider, pagos);
                const titular =
                  provider.titular_cuenta?.trim() || provider.nombre;

                return (
                  <li
                    key={provider.id}
                    className="overflow-hidden rounded-2xl border border-bloom-border bg-bloom-surface shadow-sm"
                  >
                    <div className="border-b border-bloom-border bg-bloom-canvas/60 px-5 py-4">
                      <h3 className="font-medium text-bloom-ink">
                        {provider.nombre}
                      </h3>
                      <p className="text-sm text-bloom-muted">
                        {provider.categoria}
                      </p>
                    </div>

                    <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-bloom-muted">Valor total</dt>
                          <dd className="font-medium text-bloom-ink">
                            {formatCurrency(provider.valor_total)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-bloom-muted">Anticipo pagado</dt>
                          <dd className="font-medium text-bloom-success">
                            {formatCurrency(provider.anticipo)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-bloom-muted">Saldo pendiente</dt>
                          <dd className="font-semibold text-bloom-ink">
                            {formatCurrency(saldo)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-bloom-muted">
                            Fecha de pago del saldo
                          </dt>
                          <dd className="font-medium text-bloom-ink">
                            {provider.fecha_saldo
                              ? formatShortDate(provider.fecha_saldo)
                              : "Por confirmar"}
                          </dd>
                        </div>
                      </dl>

                      <div className="rounded-xl border border-bloom-border bg-bloom-canvas/50 p-4">
                        <p className="text-xs font-medium uppercase tracking-wider text-bloom-muted">
                          Datos bancarios
                        </p>
                        <dl className="mt-3 space-y-2 text-sm">
                          <div>
                            <dt className="text-bloom-muted">Banco</dt>
                            <dd className="font-medium text-bloom-ink">
                              {provider.banco || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-bloom-muted">Tipo de cuenta</dt>
                            <dd className="font-medium text-bloom-ink">
                              {provider.tipo_cuenta || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-bloom-muted">Número de cuenta</dt>
                            <dd className="font-medium text-bloom-ink">
                              {provider.numero_cuenta || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-bloom-muted">Titular</dt>
                            <dd className="font-medium text-bloom-ink">
                              {titular}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <div className="border-t border-bloom-border px-5 py-4">
                      <h4 className="text-sm font-medium text-bloom-ink">
                        Pagos registrados
                      </h4>
                      {pagos.length === 0 ? (
                        <p className="mt-2 text-sm text-bloom-muted">
                          No hay pagos registrados.
                        </p>
                      ) : (
                        <ul className="mt-3 space-y-2">
                          {pagos.map((pago) => (
                            <li
                              key={pago.id}
                              className="rounded-lg border border-bloom-border bg-bloom-canvas/60 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="font-medium text-bloom-ink">
                                  {formatCurrency(pago.monto)}
                                </p>
                                <p className="text-bloom-muted">
                                  {formatShortDate(pago.fecha_pago)}
                                </p>
                              </div>
                              <p className="mt-1 text-bloom-muted">
                                {pago.concepto || "Sin concepto"}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
