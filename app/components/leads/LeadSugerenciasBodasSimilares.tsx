import type { SugerenciasBodasSimilaresResult } from "@/lib/sugerencias-bodas-similares";
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

function criterioSimilitudLabel(
  criterio: SugerenciasBodasSimilaresResult["criterio"],
): string {
  switch (criterio) {
    case "ciudad_ambos":
      return "misma ciudad, invitados y presupuesto";
    case "ciudad_parcial":
      return "misma ciudad e invitados o presupuesto";
    case "invitados":
      return "invitados";
    case "presupuesto":
      return "presupuesto";
    case "ambos":
    default:
      return "invitados y presupuesto";
  }
}

export function LeadSugerenciasBodasSimilares({
  result,
}: LeadSugerenciasBodasSimilaresProps) {
  const hasSuggestions = result.categorias.length > 0;

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
            por {criterioSimilitudLabel(result.criterio)}.
          </p>
        ) : (
          <p className="text-sm text-bloom-muted">
            Proveedores recomendados a partir de bodas anteriores parecidas.
          </p>
        )}
      </div>

      {!hasSuggestions ? (
        <p className="mt-4 rounded-xl border border-dashed border-bloom-border bg-bloom-canvas/50 px-4 py-8 text-center text-sm text-bloom-muted">
          {SIN_DATA_MESSAGE}
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {result.categorias.map((categoria) => (
            <div key={categoria.categoria}>
              <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-bloom-muted">
                {categoria.categoria}
              </h3>
              <ul className="mt-3 space-y-2">
                {categoria.proveedores.map((proveedor) => {
                  const instagramUrl = buildInstagramUrl(proveedor.instagram);

                  return (
                    <li
                      key={`${categoria.categoria}-${proveedor.nombre_proveedor}`}
                      className="flex flex-col gap-1 rounded-xl border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-bloom-ink">
                          {proveedor.nombre_proveedor}
                        </p>
                        <p className="mt-0.5 text-xs text-bloom-muted">
                          Referencia: {proveedor.boda_referencia}
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
        </div>
      )}
    </section>
  );
}
