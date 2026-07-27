"use client";

import Link from "next/link";
import {
  getTastingCalendarioStyle,
  type TastingCalendarioRow,
} from "@/lib/calendario-eventos";
import { formatShortDateStable } from "@/lib/format";
import {
  formatTastingHorarioRange,
  getTastingDisplayTitle,
  getTastingTipoLabel,
} from "@/lib/tastings";

type TastingCalendarioItemProps = {
  tasting: TastingCalendarioRow;
};

export function TastingCalendarioItem({ tasting }: TastingCalendarioItemProps) {
  const style = getTastingCalendarioStyle(tasting.tipo_cita);

  return (
    <article className={`rounded-xl border px-4 py-3 ${style}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {getTastingDisplayTitle(tasting)}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {getTastingTipoLabel(tasting.tipo_cita)} · {tasting.boda_nombre}
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
          className="text-xs font-medium underline-offset-2 hover:underline"
        >
          Ver boda
        </Link>
      </div>
    </article>
  );
}
