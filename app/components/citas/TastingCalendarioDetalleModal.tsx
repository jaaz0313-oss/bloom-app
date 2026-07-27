"use client";

import Link from "next/link";
import { ResponsiveModal } from "@/app/components/ui/ResponsiveModal";
import type { TastingCalendarioRow } from "@/lib/calendario-eventos";
import { formatShortDateStable } from "@/lib/format";
import {
  formatTastingHorarioRange,
  getTastingDisplayTitle,
  getTastingTipoLabel,
} from "@/lib/tastings";

type TastingCalendarioDetalleModalProps = {
  tasting: TastingCalendarioRow | null;
  onClose: () => void;
};

export function TastingCalendarioDetalleModal({
  tasting,
  onClose,
}: TastingCalendarioDetalleModalProps) {
  if (!tasting) return null;

  return (
    <ResponsiveModal
      open
      onClose={onClose}
      title={getTastingDisplayTitle(tasting)}
      subtitle={`${getTastingTipoLabel(tasting.tipo_cita)} · ${tasting.boda_nombre}`}
      size="md"
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-bloom-muted">Tipo</dt>
          <dd className="font-medium text-bloom-ink">
            {getTastingTipoLabel(tasting.tipo_cita)}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">Boda</dt>
          <dd className="font-medium text-bloom-ink">{tasting.boda_nombre}</dd>
        </div>
        <div>
          <dt className="text-bloom-muted">Fecha</dt>
          <dd className="font-medium text-bloom-ink">
            {formatShortDateStable(tasting.fecha)}
          </dd>
        </div>
        <div>
          <dt className="text-bloom-muted">Horario</dt>
          <dd className="font-medium text-bloom-ink">
            {formatTastingHorarioRange(tasting.hora_inicio, tasting.hora_fin)}
          </dd>
        </div>
        {tasting.categoria && (
          <div>
            <dt className="text-bloom-muted">Categoría</dt>
            <dd className="font-medium text-bloom-ink">{tasting.categoria}</dd>
          </div>
        )}
        {tasting.direccion && (
          <div>
            <dt className="text-bloom-muted">Dirección</dt>
            <dd className="font-medium text-bloom-ink">{tasting.direccion}</dd>
          </div>
        )}
        {tasting.asignado_nombre && (
          <div>
            <dt className="text-bloom-muted">Asignado a</dt>
            <dd className="font-medium text-bloom-ink">{tasting.asignado_nombre}</dd>
          </div>
        )}
      </dl>

      <div className="mt-6">
        <Link
          href={`/bodas/${tasting.boda_id}`}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover"
        >
          Ver boda
        </Link>
      </div>
    </ResponsiveModal>
  );
}
