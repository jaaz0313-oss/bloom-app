import Link from "next/link";
import type { Wedding } from "../data/weddings";
import { formatWeddingDate } from "@/lib/format";

function providerProgress(contracted: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((contracted / total) * 100);
}

export function WeddingCard({ wedding }: { wedding: Wedding }) {
  const progress = providerProgress(
    wedding.providersContracted,
    wedding.providersTotal,
  );
  const isComplete =
    wedding.providersTotal > 0 &&
    wedding.providersContracted >= wedding.providersTotal;

  return (
    <Link
      href={`/bodas/${wedding.id}`}
      className="block rounded-2xl border border-bloom-border bg-bloom-surface p-5 shadow-sm transition-shadow hover:border-bloom-accent/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bloom-accent"
    >
      <article className="group">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl text-bloom-ink">
              {wedding.couple}
            </h3>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-bloom-muted">Fecha</dt>
                <dd className="font-medium text-bloom-ink">
                  {formatWeddingDate(wedding.date)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-bloom-muted">Ciudad</dt>
                <dd className="font-medium text-bloom-ink">{wedding.city}</dd>
              </div>
            </dl>
          </div>

          <div className="w-full shrink-0 sm:w-48">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-bloom-muted">Proveedores</span>
              <span className="font-medium text-bloom-ink">
                {wedding.providersContracted}
                <span className="text-bloom-muted">
                  {" "}
                  / {wedding.providersTotal}
                </span>
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-bloom-border">
              <div
                className={`h-full rounded-full transition-all ${
                  isComplete ? "bg-bloom-success" : "bg-bloom-accent"
                }`}
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={wedding.providersContracted}
                aria-valuemin={0}
                aria-valuemax={wedding.providersTotal}
                aria-label={`${wedding.providersContracted} de ${wedding.providersTotal} proveedores contratados`}
              />
            </div>
            <p className="mt-1.5 text-xs text-bloom-muted">
              {isComplete
                ? "Todos los proveedores contratados"
                : `${wedding.providersTotal - wedding.providersContracted} pendientes`}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
