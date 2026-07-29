import type {
  LeadListadoEstado,
  LeadRow,
  LeadSeguimientoStatus,
} from "@/app/data/leads";

const SEGUIMIENTO_VALUES: LeadSeguimientoStatus[] = [
  "nuevo",
  "en_conversacion",
  "perdido",
];

/** Compatibilidad antes de migrar estado → estado_seguimiento + estado listado. */
export function normalizeLeadRow(raw: Record<string, unknown>): LeadRow {
  const estadoRaw = String(raw.estado ?? "activo");
  const isListadoEstado =
    estadoRaw === "activo" || estadoRaw === "descartado";

  let estado_seguimiento = raw.estado_seguimiento as
    | LeadSeguimientoStatus
    | undefined;
  if (
    !estado_seguimiento ||
    !SEGUIMIENTO_VALUES.includes(estado_seguimiento)
  ) {
    if (!isListadoEstado && SEGUIMIENTO_VALUES.includes(estadoRaw as LeadSeguimientoStatus)) {
      estado_seguimiento = estadoRaw as LeadSeguimientoStatus;
    } else {
      estado_seguimiento = "nuevo";
    }
  }

  const estado: LeadListadoEstado = isListadoEstado ? estadoRaw : "activo";

  return {
    ...(raw as LeadRow),
    como_nos_conocieron:
      (raw.como_nos_conocieron as string | null | undefined) ?? null,
    estado,
    estado_seguimiento,
  };
}

export function partitionLeadsForDashboard(
  leads: LeadRow[],
  convertedLeadIds: ReadonlySet<string>,
): {
  activeLeads: LeadRow[];
  discardedLeads: LeadRow[];
} {
  const activeLeads: LeadRow[] = [];
  const discardedLeads: LeadRow[] = [];

  for (const lead of leads) {
    const listadoEstado: LeadListadoEstado = lead.estado ?? "activo";
    if (listadoEstado === "descartado") {
      discardedLeads.push(lead);
      continue;
    }
    if (!convertedLeadIds.has(lead.id)) {
      activeLeads.push(lead);
    }
  }

  return { activeLeads, discardedLeads };
}
