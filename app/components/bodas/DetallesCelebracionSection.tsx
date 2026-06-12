import type { DetallesCelebracionRow } from "@/app/data/detalles-celebracion";
import { DETALLES_CELEBRACION_FIELDS } from "@/lib/detalles-celebracion";

type DetallesCelebracionSectionProps = {
  detalles: DetallesCelebracionRow | null;
  embedded?: boolean;
};

export function DetallesCelebracionSection({
  detalles,
  embedded = false,
}: DetallesCelebracionSectionProps) {
  const Shell = embedded ? "div" : "section";
  const shellClass = embedded
    ? "space-y-4"
    : "rounded-xl border border-bloom-border bg-bloom-surface p-5 shadow-sm sm:p-6";

  return (
    <Shell className={shellClass}>
      {!embedded && (
        <h2 className="font-display text-xl text-bloom-ink">
          Detalles de la boda
        </h2>
      )}

      <p className="text-sm text-bloom-muted">
        Respuestas completadas por los clientes en su portal.
      </p>

      <dl className="space-y-4">
        {DETALLES_CELEBRACION_FIELDS.map((field) => {
          const value = detalles?.[field.key]?.trim() ?? "";

          return (
            <div
              key={field.key}
              className="rounded-lg border border-bloom-border/80 bg-bloom-canvas/40 px-4 py-3"
            >
              <dt className="text-sm font-medium text-bloom-muted">
                {field.labelEs}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-bloom-ink">
                {value || (
                  <span className="text-bloom-muted italic">Sin respuesta</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Shell>
  );
}
