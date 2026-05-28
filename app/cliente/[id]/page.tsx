import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { BodaRow } from "@/app/data/weddings";
import {
  computePaymentProjection,
  getProviderSaldoPendiente,
  type ProveedorRow,
} from "@/app/data/providers";
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
  const { saldoPendiente } = computePaymentProjection(contratados);

  return (
    <div className="min-h-full bg-bloom-canvas font-sans">
      <header className="border-b border-bloom-border bg-bloom-surface">
        <div className="mx-auto max-w-3xl px-6 py-8 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-bloom-muted">
            Bloom
          </p>
          <h1 className="mt-2 font-display text-3xl text-bloom-ink sm:text-4xl">
            {bodaRow.nombre_pareja}
          </h1>
          <p className="mt-2 text-lg text-bloom-muted">
            {formatWeddingDate(bodaRow.fecha_boda)}
            {bodaRow.ciudad ? ` · ${bodaRow.ciudad}` : ""}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 sm:px-8">
        <section className="rounded-2xl border border-bloom-accent/20 bg-bloom-surface p-6 shadow-sm">
          <p className="text-sm font-medium text-bloom-muted">
            Total de pagos pendientes
          </p>
          <p className="mt-1 font-display text-3xl text-bloom-ink">
            {formatCurrency(saldoPendiente)}
          </p>
          <p className="mt-2 text-sm text-bloom-muted">
            Suma de saldos pendientes de proveedores contratados
          </p>
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
                const saldo = getProviderSaldoPendiente(provider);
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
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="mt-12 border-t border-bloom-border pt-6 text-center text-xs text-bloom-muted">
          Resumen preparado por tu wedding planner · Bloom
        </footer>
      </main>
    </div>
  );
}
