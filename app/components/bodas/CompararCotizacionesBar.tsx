"use client";

import { useState } from "react";
import type { ProveedorRow } from "@/app/data/providers";
import {
  buildCompararCotizacionesMessage,
  enviarComparacionCotizaciones,
} from "@/lib/proveedor-comparar-cotizaciones";

type CompararCotizacionesBarProps = {
  categoria: string;
  proveedores: ProveedorRow[];
  grupoLink: string | null;
};

export function CompararCotizacionesBar({
  categoria,
  proveedores,
  grupoLink,
}: CompararCotizacionesBarProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const message = buildCompararCotizacionesMessage(
    categoria,
    proveedores.map((p) => ({
      nombre: p.nombre,
      monto_cotizado: p.monto_cotizado,
      descripcion_servicio: p.descripcion_servicio,
    })),
  );

  async function handleComparar() {
    setFeedback(null);
    setSending(true);
    try {
      const result = await enviarComparacionCotizaciones(grupoLink, message);
      if (result === "opened") {
        setFeedback("WhatsApp abierto con el mensaje para el grupo.");
      } else {
        setFeedback(
          grupoLink?.trim()
            ? "No se pudo abrir el grupo. Mensaje copiado al portapapeles."
            : "No hay link del grupo. Mensaje copiado al portapapeles.",
        );
      }
    } catch {
      setFeedback("No se pudo copiar el mensaje. Intenta de nuevo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/5 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-bloom-ink">
          <span className="font-medium">{categoria}</span>
          <span className="text-bloom-muted">
            {" "}
            · {proveedores.length} opciones en negociación
          </span>
        </p>
        <button
          type="button"
          onClick={handleComparar}
          disabled={sending}
          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#25D366] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#20bd5a] disabled:opacity-60"
        >
          {sending ? "Abriendo…" : "Comparar y enviar opciones"}
        </button>
      </div>
      {feedback && (
        <p className="mt-2 text-xs text-bloom-muted" role="status">
          {feedback}
        </p>
      )}
    </div>
  );
}
