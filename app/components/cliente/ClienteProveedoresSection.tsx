import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  getProviderSaldoPendienteConPagos,
  type ProveedorRow,
} from "@/app/data/providers";
import type { PagoRow } from "@/app/data/pagos";

type ClienteProveedoresSectionProps = {
  contratados: ProveedorRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
};

export function ClienteProveedoresSection({
  contratados,
  pagosByProveedor,
}: ClienteProveedoresSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-bloom-border/80 bg-bloom-surface shadow-sm">
      <div className="border-b border-bloom-border/70 bg-gradient-to-br from-bloom-canvas/80 to-bloom-surface px-5 py-7 sm:px-8 sm:py-8">
        <h2 className="font-display text-2xl text-bloom-ink sm:text-3xl">
          Proveedores contratados
        </h2>
        <p className="mt-2 text-sm text-bloom-muted sm:text-base">
          {contratados.length}{" "}
          {contratados.length === 1 ? "proveedor" : "proveedores"} confirmados
          para su celebración
        </p>
      </div>

      <div className="px-5 py-6 sm:px-8 sm:py-8">
        {contratados.length === 0 ? (
          <p className="rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-5 py-12 text-center text-sm text-bloom-muted">
            Aún no hay proveedores contratados para mostrar.
          </p>
        ) : (
          <ul className="space-y-6">
            {contratados.map((provider) => {
              const pagos = pagosByProveedor[provider.id] ?? [];
              const saldo = getProviderSaldoPendienteConPagos(provider, pagos);
              const titular =
                provider.titular_cuenta?.trim() || provider.nombre;

              return (
                <li
                  key={provider.id}
                  className="overflow-hidden rounded-xl border border-bloom-border/80 bg-bloom-canvas/30"
                >
                  <div className="border-b border-bloom-border/60 bg-bloom-surface/80 px-5 py-4 sm:px-6">
                    <h3 className="font-display text-xl text-bloom-ink">
                      {provider.nombre}
                    </h3>
                    <p className="mt-0.5 text-sm text-bloom-muted">
                      {provider.categoria}
                    </p>
                  </div>

                  <div className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-6">
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

                    <div className="rounded-xl border border-bloom-border/70 bg-bloom-surface/90 p-4">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-bloom-muted">
                        Datos para transferencia
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

                  <div className="border-t border-bloom-border/60 px-5 py-4 sm:px-6">
                    <h4 className="font-display text-lg text-bloom-ink">
                      Historial de pagos
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
                            className="rounded-lg border border-bloom-border/70 bg-bloom-surface px-3 py-2.5 text-sm"
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
      </div>
    </section>
  );
}
