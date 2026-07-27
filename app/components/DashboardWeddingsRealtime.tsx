"use client";

import { useEffect, useState } from "react";
import {
  ActiveWeddingsSection,
  type SearchableWedding,
} from "@/app/components/ActiveWeddingsSection";
import { FinishedWeddingsSection } from "@/app/components/FinishedWeddingsSection";
import {
  mapBodaToWedding,
  type BodaRow,
  type Wedding,
} from "@/app/data/weddings";
import { isBodaActiva, isBodaFinalizada } from "@/lib/boda-estado";
import { subscribeRealtimeTables, upsertById } from "@/lib/supabase-realtime";

type DashboardWeddingsRealtimeProps = {
  initialActive: SearchableWedding[];
  initialFinished: Wedding[];
  newWeddingButton?: React.ReactNode;
};

function toSearchableWedding(row: BodaRow): SearchableWedding {
  return {
    ...mapBodaToWedding(row),
    brideName: row.nombre_novia,
    groomName: row.nombre_novio,
  };
}

function toFinishedWedding(row: BodaRow): Wedding {
  return mapBodaToWedding(row);
}

function sortByDate(a: { date: string }, b: { date: string }): number {
  return a.date.localeCompare(b.date);
}

function mergeSearchable(
  list: SearchableWedding[],
  wedding: SearchableWedding,
): SearchableWedding[] {
  return upsertById(list, wedding).sort(sortByDate);
}

function mergeFinished(list: Wedding[], wedding: Wedding): Wedding[] {
  return upsertById(list, wedding).sort(sortByDate);
}

/**
 * Mantiene las listas de bodas activas/finalizadas al día vía Realtime
 * (INSERT/UPDATE de `bodas`) sin recargar el dashboard.
 */
export function DashboardWeddingsRealtime({
  initialActive,
  initialFinished,
  newWeddingButton,
}: DashboardWeddingsRealtimeProps) {
  const [active, setActive] = useState(initialActive);
  const [finished, setFinished] = useState(initialFinished);

  useEffect(() => {
    setActive(initialActive);
  }, [initialActive]);

  useEffect(() => {
    setFinished(initialFinished);
  }, [initialFinished]);

  useEffect(() => {
    return subscribeRealtimeTables("dashboard-bodas", [
      {
        table: "bodas",
        event: "*",
        onPayload: (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<BodaRow>;
            if (!oldRow.id) return;
            setActive((prev) => prev.filter((w) => w.id !== oldRow.id));
            setFinished((prev) => prev.filter((w) => w.id !== oldRow.id));
            return;
          }

          const row = payload.new as BodaRow;
          if (!row?.id) return;

          if (isBodaActiva(row.estado)) {
            const wedding = toSearchableWedding(row);
            setActive((prev) => {
              const existing = prev.find((w) => w.id === row.id);
              return mergeSearchable(prev, {
                ...wedding,
                // Conservar conteos locales si ya estaban (Realtime no trae proveedores).
                providersContracted:
                  existing?.providersContracted ?? wedding.providersContracted,
                providersTotal:
                  existing?.providersTotal ?? wedding.providersTotal,
              });
            });
            setFinished((prev) => prev.filter((w) => w.id !== row.id));
            return;
          }

          if (isBodaFinalizada(row.estado)) {
            const wedding = toFinishedWedding(row);
            setFinished((prev) => {
              const existing = prev.find((w) => w.id === row.id);
              return mergeFinished(prev, {
                ...wedding,
                providersContracted:
                  existing?.providersContracted ?? wedding.providersContracted,
                providersTotal:
                  existing?.providersTotal ?? wedding.providersTotal,
              });
            });
            setActive((prev) => prev.filter((w) => w.id !== row.id));
            return;
          }

          // Cancelada u otro estado: sacar de ambas listas visibles.
          setActive((prev) => prev.filter((w) => w.id !== row.id));
          setFinished((prev) => prev.filter((w) => w.id !== row.id));
        },
      },
    ]);
  }, []);

  return (
    <>
      <ActiveWeddingsSection
        weddings={active}
        newWeddingButton={newWeddingButton}
      />
      <div className="mt-10">
        <FinishedWeddingsSection weddings={finished} />
      </div>
    </>
  );
}
