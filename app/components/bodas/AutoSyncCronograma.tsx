"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { actualizarCronograma } from "@/lib/cronograma";
import { supabase } from "@/lib/supabase";

export const CRONOGRAMA_AUTO_SYNCED_EVENT = "bloom:cronograma-auto-synced";

const STORAGE_PREFIX = "bloom:cronograma-auto-sync:";
const syncedInMemory = new Set<string>();

type AutoSyncCronogramaProps = {
  bodaId: string;
  fechaBoda: string;
  hasCronograma: boolean;
};

/**
 * Al abrir el detalle de una boda, inserta en segundo plano hitos nuevos de la
 * plantilla que falten en el cronograma. Una vez por sesión por boda.
 */
export function AutoSyncCronograma({
  bodaId,
  fechaBoda,
  hasCronograma,
}: AutoSyncCronogramaProps) {
  const router = useRouter();

  useEffect(() => {
    if (!hasCronograma || !fechaBoda.trim() || !supabase) return;
    if (syncedInMemory.has(bodaId)) return;

    const client = supabase;
    const storageKey = `${STORAGE_PREFIX}${bodaId}`;
    try {
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(storageKey)
      ) {
        syncedInMemory.add(bodaId);
        return;
      }
      sessionStorage?.setItem(storageKey, "1");
    } catch {
      // sessionStorage puede fallar (modo privado); seguimos con el flag en memoria.
    }

    syncedInMemory.add(bodaId);

    void (async () => {
      const result = await actualizarCronograma(client, bodaId, fechaBoda, {
        removeObsolete: false,
      });

      if (!result.ok) {
        console.error("[AutoSyncCronograma]", result.message);
        return;
      }

      if (result.added > 0) {
        window.dispatchEvent(
          new CustomEvent(CRONOGRAMA_AUTO_SYNCED_EVENT, {
            detail: { bodaId },
          }),
        );
        router.refresh();
      }
    })();
  }, [bodaId, fechaBoda, hasCronograma, router]);

  return null;
}
