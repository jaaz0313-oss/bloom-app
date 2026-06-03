"use client";

import { useState } from "react";
import { CotizacionEditor } from "@/app/components/cotizaciones/CotizacionEditor";
import { LeadCotizacionShareActions } from "@/app/components/leads/LeadCotizacionShareActions";
import type { CotizacionItemRow, CotizacionRow } from "@/app/data/cotizaciones";
import type { DirectorioProveedorRow } from "@/app/data/directorio";
import type { LeadRow } from "@/app/data/leads";
import type { HistoricoPrecioCategoria } from "@/lib/cotizacion-lead";

type LeadCotizacionPanelProps = {
  lead: LeadRow;
  cotizacion: CotizacionRow;
  items: CotizacionItemRow[];
  directorio: DirectorioProveedorRow[];
  historico: HistoricoPrecioCategoria[];
};

export function LeadCotizacionPanel({
  lead,
  cotizacion,
  items,
  directorio,
  historico,
}: LeadCotizacionPanelProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <section className="mt-6">
        <CotizacionEditor
          embedded
          cotizacion={cotizacion}
          lead={lead}
          initialItems={items}
          directorio={directorio}
          historico={historico}
          onClose={() => setEditing(false)}
        />
      </section>
    );
  }

  return (
    <LeadCotizacionShareActions
      lead={lead}
      cotizacion={cotizacion}
      items={items}
      onEdit={() => setEditing(true)}
    />
  );
}
