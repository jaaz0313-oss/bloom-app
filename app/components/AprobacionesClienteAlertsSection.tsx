"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AprobacionClientePendienteAlert } from "@/app/data/aprobaciones-cliente";
import { DashboardAccordionSection } from "@/app/components/DashboardAccordionSection";
import { marcarHitoCronogramaPorProveedorContratado } from "@/lib/cronograma";
import { supabase } from "@/lib/supabase";
import { syncBodaProveedoresContratados } from "@/lib/sync-boda";

type AprobacionesClienteAlertsSectionProps = {
  alerts: AprobacionClientePendienteAlert[];
};

export function AprobacionesClienteAlertsSection({
  alerts,
}: AprobacionesClienteAlertsSectionProps) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  if (alerts.length === 0) return null;

  async function handleConfirm(alert: AprobacionClientePendienteAlert) {
    if (!supabase || confirmingId) return;

    setConfirmingId(alert.id);
    setErrorById((prev) => {
      const next = { ...prev };
      delete next[alert.id];
      return next;
    });

    try {
      const { error: providerError } = await supabase
        .from("proveedores")
        .update({ estado: "contratado" })
        .eq("id", alert.proveedorId)
        .eq("boda_id", alert.bodaId);

      if (providerError) {
        setErrorById((prev) => ({
          ...prev,
          [alert.id]: providerError.message,
        }));
        return;
      }

      const { error: aprobacionError } = await supabase
        .from("aprobaciones_cliente")
        .update({ estado: "confirmada" })
        .eq("id", alert.id);

      if (aprobacionError) {
        setErrorById((prev) => ({
          ...prev,
          [alert.id]: aprobacionError.message,
        }));
        return;
      }

      await syncBodaProveedoresContratados(alert.bodaId);
      await marcarHitoCronogramaPorProveedorContratado(
        supabase,
        alert.bodaId,
        alert.categoria,
      );

      router.refresh();
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <DashboardAccordionSection
      title="Aprobaciones pendientes del cliente"
      count={alerts.length}
      subtitle="El cliente ya eligió estos proveedores; confirma para contratarlos"
      defaultOpen
    >
      <ul className="space-y-3">
        {alerts.map((alert) => (
          <li key={alert.id}>
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-bloom-ink">
                  {alert.nombrePareja}
                </p>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-2 sm:gap-4">
                  <div>
                    <dt className="text-bloom-muted">Proveedor</dt>
                    <dd className="font-medium text-bloom-ink">
                      {alert.proveedorNombre}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-bloom-muted">Categoría</dt>
                    <dd className="font-medium text-bloom-ink">
                      {alert.categoria}
                    </dd>
                  </div>
                </dl>
                {errorById[alert.id] ? (
                  <p className="mt-2 text-xs text-red-700" role="alert">
                    {errorById[alert.id]}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => handleConfirm(alert)}
                disabled={confirmingId === alert.id}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-green-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                {confirmingId === alert.id
                  ? "Confirmando…"
                  : "Confirmar y contratar"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </DashboardAccordionSection>
  );
}
