"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BodaRow } from "@/app/data/weddings";
import { formatWeddingDate } from "@/lib/format";
import { bodaFechaNecesitaReconfirmar } from "@/lib/boda-fecha-confirmada-utils";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/auth/roles";

type BodaFechaConfirmadaProps = {
  bodaId: string;
  boda: Pick<
    BodaRow,
    | "fecha_boda"
    | "fecha_confirmada"
    | "google_event_id_fecha"
    | "fecha_boda_confirmada"
  >;
  role: UserRole;
};

function canManageFechaConfirmada(role: UserRole): boolean {
  return role === "admin" || role === "lider";
}

function normalizeIsoDate(value: string): string {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? value.trim();
}

export function BodaFechaConfirmada({
  bodaId,
  boda,
  role,
}: BodaFechaConfirmadaProps) {
  const router = useRouter();
  const canManage = canManageFechaConfirmada(role);

  const [fechaBoda, setFechaBoda] = useState(boda.fecha_boda);
  const [fechaConfirmada, setFechaConfirmada] = useState(
    Boolean(boda.fecha_confirmada),
  );
  const [fechaBodaConfirmada, setFechaBodaConfirmada] = useState(
    boda.fecha_boda_confirmada,
  );
  const [submitting, setSubmitting] = useState(false);
  const [savingFecha, setSavingFecha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaCambioAviso, setFechaCambioAviso] = useState(false);

  useEffect(() => {
    setFechaBoda(boda.fecha_boda);
    setFechaConfirmada(Boolean(boda.fecha_confirmada));
    setFechaBodaConfirmada(boda.fecha_boda_confirmada);
    setFechaCambioAviso(
      bodaFechaNecesitaReconfirmar({
        fecha_confirmada: boda.fecha_confirmada,
        fecha_boda: boda.fecha_boda,
        fecha_boda_confirmada: boda.fecha_boda_confirmada,
      }),
    );
  }, [
    boda.fecha_boda,
    boda.fecha_confirmada,
    boda.fecha_boda_confirmada,
  ]);

  const necesitaReconfirmar =
    fechaCambioAviso ||
    bodaFechaNecesitaReconfirmar({
      fecha_confirmada: fechaConfirmada,
      fecha_boda: fechaBoda,
      fecha_boda_confirmada: fechaBodaConfirmada,
    });

  async function handleToggleConfirmacion() {
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch(`/api/bodas/${bodaId}/confirmar-fecha`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: !fechaConfirmada }),
      });

      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        fecha_confirmada?: boolean;
        google_event_id_fecha?: string | null;
      } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo actualizar la fecha.");
      }

      const confirmed = Boolean(payload?.fecha_confirmada);
      setFechaConfirmada(confirmed);
      setFechaBodaConfirmada(confirmed ? normalizeIsoDate(fechaBoda) : null);
      setFechaCambioAviso(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo actualizar la fecha.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveFecha() {
    if (!canManage || !supabase) return;

    const normalized = normalizeIsoDate(fechaBoda);
    if (!normalized) {
      setError("Ingresa una fecha válida.");
      return;
    }

    const fechaCambio = normalized !== normalizeIsoDate(boda.fecha_boda);
    const estabaConfirmada = fechaConfirmada;

    setError(null);
    setSavingFecha(true);

    try {
      if (fechaCambio && estabaConfirmada) {
        const desconfirmResponse = await fetch(
          `/api/bodas/${bodaId}/confirmar-fecha`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirm: false }),
          },
        );

        if (!desconfirmResponse.ok) {
          const payload = (await desconfirmResponse.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            payload?.error ?? "No se pudo desconfirmar la fecha anterior.",
          );
        }

        setFechaConfirmada(false);
        setFechaBodaConfirmada(null);
        setFechaCambioAviso(true);
      }

      const { error: updateError } = await supabase
        .from("bodas")
        .update({ fecha_boda: normalized })
        .eq("id", bodaId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setFechaBoda(normalized);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la fecha.",
      );
    } finally {
      setSavingFecha(false);
    }
  }

  const fechaCambioPendiente =
    canManage &&
    normalizeIsoDate(fechaBoda) !== normalizeIsoDate(boda.fecha_boda);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {canManage ? (
          <input
            type="date"
            value={normalizeIsoDate(fechaBoda)}
            onChange={(e) => {
              setFechaBoda(e.target.value);
              if (
                fechaConfirmada &&
                normalizeIsoDate(e.target.value) !==
                  normalizeIsoDate(fechaBodaConfirmada ?? boda.fecha_boda)
              ) {
                setFechaCambioAviso(true);
              }
            }}
            disabled={submitting || savingFecha}
            className="rounded-lg border border-bloom-border bg-bloom-canvas px-2.5 py-1.5 text-sm font-medium text-bloom-ink outline-none focus:border-bloom-accent focus:ring-2 focus:ring-bloom-accent/30 disabled:opacity-60"
          />
        ) : (
          <span className="font-medium text-bloom-ink">
            {formatWeddingDate(fechaBoda)}
          </span>
        )}

        {canManage && fechaCambioPendiente && (
          <button
            type="button"
            onClick={handleSaveFecha}
            disabled={savingFecha || submitting}
            className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            {savingFecha ? "Guardando…" : "Guardar fecha"}
          </button>
        )}

        {canManage && !fechaConfirmada && (
          <button
            type="button"
            onClick={handleToggleConfirmacion}
            disabled={submitting || savingFecha || fechaCambioPendiente}
            className="rounded-full border border-bloom-border bg-bloom-surface px-3 py-1.5 text-xs font-medium text-bloom-ink transition-colors hover:bg-bloom-canvas disabled:opacity-60"
          >
            {submitting ? "Procesando…" : "✓ Confirmar fecha"}
          </button>
        )}

        {fechaConfirmada && !necesitaReconfirmar && (
          <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
            Fecha confirmada ✓
          </span>
        )}

        {canManage && fechaConfirmada && (
          <button
            type="button"
            onClick={handleToggleConfirmacion}
            disabled={submitting || savingFecha}
            className="rounded-full border border-bloom-border px-3 py-1.5 text-xs font-medium text-bloom-muted transition-colors hover:bg-bloom-canvas hover:text-bloom-ink disabled:opacity-60"
          >
            {submitting ? "Procesando…" : "Desconfirmar"}
          </button>
        )}
      </div>

      {necesitaReconfirmar && (
        <p
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
          role="status"
        >
          La fecha ha cambiado. Recuerda reconfirmar para actualizar el bloqueo
          en Calendar.
        </p>
      )}

      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
