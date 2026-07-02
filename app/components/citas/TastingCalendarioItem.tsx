"use client";

import Link from "next/link";
import {
  TASTING_CALENDARIO_STYLE,
  type TastingCalendarioRow,
} from "@/lib/calendario-eventos";
import { formatShortDateStable } from "@/lib/format";
import { formatTastingHorarioRange } from "@/lib/tastings";

type TastingCalendarioItemProps = {
  tasting: TastingCalendarioRow;
};

export function TastingCalendarioItem({ tasting }: TastingCalendarioItemProps) {
  return (
    <article className={`rounded-xl border px-4 py-3 ${TASTING_CALENDARIO_STYLE}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">{tasting.nombre_proveedor}</p>
          <p className="mt-0.5 text-xs opacity-80">
            Tasting · {tasting.boda_nombre}
          </p>
          {tasting.categoria && (
            <p className="mt-1 text-xs opacity-80">{tasting.categoria}</p>
          )}
        </div>
        <div className="text-right text-xs opacity-80">
          <p>{formatShortDateStable(tasting.fecha)}</p>
          <p>{formatTastingHorarioRange(tasting.hora_inicio, tasting.hora_fin)}</p>
        </div>
      </div>
      <div className="mt-3">
        <Link
          href={`/bodas/${tasting.boda_id}`}
          className="text-xs font-medium text-fuchsia-900 underline-offset-2 hover:underline"
        >
          Ver boda
        </Link>
      </div>
    </article>
  );
}
