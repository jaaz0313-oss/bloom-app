"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  COTIZACION_ESTADO_LABELS,
  type CotizacionRow,
} from "@/app/data/cotizaciones";
import type { LeadRow } from "@/app/data/leads";
import { formatShortDate } from "@/lib/format";
import { createCotizacionForLead } from "@/lib/create-lead-cotizacion";
import { supabase } from "@/lib/supabase";

type LeadCotizacionesSectionProps = {
  lead: LeadRow;
  cotizaciones: CotizacionRow[];
};

export function LeadCotizacionesSection({
  lead,
  cotizaciones,
}: LeadCotizacionesSectionProps) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    if (!supabase) {
      setError("Supabase no está configurado.");
      return;
    }

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const result = await createCotizacionForLead(
        supabase,
        lead,
        user?.id ?? null,
      );

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push(`/cotizaciones/${result.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-display text-xl text-bloom-ink">Cotizaciones</h2>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center justify-center rounded-full bg-bloom-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-bloom-accent-hover disabled:opacity-60"
        >
          {creating ? "Creando…" : "Crear cotización"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {cotizaciones.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-bloom-border bg-bloom-surface px-5 py-8 text-center text-sm text-bloom-muted">
          Aún no hay cotizaciones para este lead.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {cotizaciones.map((cot) => (
            <li key={cot.id}>
              <Link
                href={`/cotizaciones/${cot.id}`}
                className="flex items-center justify-between rounded-xl border border-bloom-border bg-bloom-surface px-4 py-3 text-sm transition-colors hover:bg-bloom-canvas"
              >
                <span className="font-medium text-bloom-ink">
                  Cotización ·{" "}
                  {cot.fecha_estimada
                    ? formatShortDate(cot.fecha_estimada)
                    : formatShortDate(cot.created_at.slice(0, 10))}
                </span>
                <span className="text-xs text-bloom-muted">
                  {COTIZACION_ESTADO_LABELS[cot.estado]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
