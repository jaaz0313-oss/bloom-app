import type {
  IndicadorPresupuesto,
  SugerenciasBodasSimilaresResult,
} from "@/lib/sugerencias-bodas-similares";
import {
  buildInstagramUrl,
  formatInstagramDisplay,
} from "@/lib/proveedores-sugeridos";
import { formatCurrency } from "@/lib/format";

type LeadSugerenciasBodasSimilaresProps = {
  result: SugerenciasBodasSimilaresResult;
};

const SIN_DATA_MESSAGE =
  "Aún no hay suficientes bodas registradas para generar sugerencias. Las sugerencias aparecerán automáticamente a medida que registres más bodas.";

const SIN_CRITERIOS_MESSAGE =
  "Agrega ciudad, número de invitados o presupuesto al lead para ver sugerencias más precisas.";

function criterioSimilitudLabel(
  criterio: SugerenciasBodasSimilaresResult["criterio"],
): string {
  switch (criterio) {
    case "ciudad_ambos":
      return "misma ciudad, invitados y presupuesto (±30%)";
    case "ciudad_parcial":
      return "misma ciudad e invitados o presupuesto (±30%)";
    case "ciudad_invitados":
      return "misma ciudad e invitados (±30%)";
    case "ciudad":
      return "misma ciudad";
    case "nacional":
      return "invitados y presupuesto a nivel nacional (±30%)";
    case "relajado":
      return "criterios relajados (±50%)";
    case "invitados":
      return "invitados";
    case "presupuesto":
      return "presupuesto";
    default:
      return "bodas similares";
  }
}

function indicadorBadgeClass(indicador: IndicadorPresupuesto): string {
  switch (indicador) {
    case "verde":
      return "bg-green-100 text-green-800";
    case "amarillo":
      return "bg-amber-100 text-amber-900";
    case "rojo":
      return "bg-red-100 text-red-800";
  }
}

function indicadorLabel(indicador: IndicadorPresupuesto): string {
  switch (indicador) {
    case "verde":
      return "Dentro del rango";
    case "amarillo":
      return "Sobre el promedio";
    case "rojo":
      return "Muy por encima";
  }
}

export function LeadSugerenciasBodasSimilares({
  result,
}: LeadSugerenciasBodasSimilaresProps) {
  const hasSuggestions = result.categorias.length > 0;
  const presupuestoLead = result.presupuestoLead;
  const hasPresupuesto = presupuestoLead != null && presupuestoLead > 0;
  const estimadoTotal = result.estimadoTotal;
  const diferencia = hasPresupuesto
    ? estimadoTotal - presupuestoLead
    : null;
  const porcentajeUsado = hasPresupuesto
    ? Math.round((estimadoTotal / presupuestoLead) * 1000) / 10
    : null;

  return (
    <section className="mt-6 rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl text-bloom-ink">
          Sugerencias basadas en bodas similares
        </h2>
        {hasSuggestions ? (
          <p className="text-sm text-bloom-muted">
            Basado en {result.bodasSimilaresCount}{" "}
            {result.bodasSimilaresCount === 1 ? "boda similar" : "bodas similares"}{" "}
            por {criterioSimilitudLabel(result.criterio)}. Hasta 3 opciones por
            categoría, de menor a mayor precio.
          </p>
        ) : (
          <p className="text-sm text-bloom-muted">
            Proveedores recomendados a partir de bodas anteriores parecidas.
          </p>
        )}
      </div>

      {!hasSuggestions ? (
        <p className="mt-4 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-4 py-8 text-center text-sm text-bloom-muted">
          {result.sinCriterios ? SIN_CRITERIOS_MESSAGE : SIN_DATA_MESSAGE}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {result.categorias.map((categoria) => (
            <div key={categoria.categoria}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-bloom-muted">
                  {categoria.categoria}
                </h3>
                {hasPresupuesto && categoria.promedio_categoria > 0 && (
                  <p className="text-xs text-bloom-muted">
                    Promedio histórico:{" "}
                    {formatCurrency(categoria.promedio_categoria)}
                  </p>
                )}
              </div>
              <ul className="mt-3 space-y-2">
                {categoria.proveedores.map((proveedor, index) => {
                  const instagramUrl = buildInstagramUrl(proveedor.instagram);

                  return (
                    <li
                      key={`${categoria.categoria}-${proveedor.nombre_proveedor}`}
                      className="flex flex-col gap-2 rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-bloom-ink">
                            {index === 0 ? "★ " : ""}
                            {proveedor.nombre_proveedor}
                          </p>
                          {proveedor.indicador && (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${indicadorBadgeClass(proveedor.indicador)}`}
                            >
                              {indicadorLabel(proveedor.indicador)}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-bloom-muted">
                          Referencia: {proveedor.boda_referencia}
                          {proveedor.porcentaje_presupuesto != null
                            ? ` · ${proveedor.porcentaje_presupuesto}% del presupuesto`
                            : ""}
                        </p>
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-block text-sm text-bloom-accent underline decoration-bloom-accent/40 underline-offset-2"
                          >
                            {formatInstagramDisplay(proveedor.instagram)}
                          </a>
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-medium text-bloom-ink">
                        {formatCurrency(proveedor.precio_historico)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div className="rounded-xl border border-bloom-border bg-bloom-canvas/60 px-4 py-4">
            <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-bloom-muted">
              Estimado total
            </h3>
            <p className="mt-1 text-xs text-bloom-muted">
              Usando la opción más económica de cada categoría.
            </p>
            {hasPresupuesto ? (
              <>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-bloom-muted">Costo estimado</dt>
                    <dd className="font-medium text-bloom-ink">
                      {formatCurrency(estimadoTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Presupuesto del lead</dt>
                    <dd className="font-medium text-bloom-ink">
                      {formatCurrency(presupuestoLead)}
                    </dd>
                  </div>
                </dl>
                {diferencia != null && porcentajeUsado != null && (
                  <p
                    className={`mt-3 text-sm font-medium ${
                      diferencia <= 0 ? "text-green-800" : "text-amber-900"
                    }`}
                  >
                    {diferencia <= 0
                      ? `Cabe en el presupuesto · ${porcentajeUsado}% usado · sobran ${formatCurrency(Math.abs(diferencia))}`
                      : `Supera el presupuesto en ${formatCurrency(diferencia)} · ${porcentajeUsado}% del presupuesto`}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-lg font-medium text-bloom-ink">
                {formatCurrency(estimadoTotal)}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
