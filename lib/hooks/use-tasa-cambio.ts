"use client";

import { useEffect, useState } from "react";

type TasaCambioResponse = {
  copPorUsd?: number;
};

/** Carga la tasa COP/USD desde `/api/tasa-cambio` (cacheada 1 h en servidor). */
export function useTasaCambio(): number | null {
  const [copPorUsd, setCopPorUsd] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/tasa-cambio");
        if (!response.ok) return;
        const payload = (await response.json()) as TasaCambioResponse;
        if (
          !cancelled &&
          typeof payload.copPorUsd === "number" &&
          Number.isFinite(payload.copPorUsd) &&
          payload.copPorUsd > 0
        ) {
          setCopPorUsd(payload.copPorUsd);
        }
      } catch {
        /* silencioso: la UI sigue mostrando solo COP */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return copPorUsd;
}
