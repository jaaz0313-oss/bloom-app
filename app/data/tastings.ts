export type TastingTipoCita = "tasting" | "visita" | "reunion";

export type TastingRow = {
  id: string;
  boda_id: string;
  proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string | null;
  tipo_cita: TastingTipoCita | string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  direccion: string | null;
  costo: number;
  costo_pagado: boolean;
  prueba_pagada: boolean;
  asignado_a: string | null;
  asignado_nombre: string | null;
  confirmado: boolean;
  notas: string | null;
  email_invitado: string | null;
  google_event_id: string | null;
  created_at: string;
};

export function normalizeTastingRow(row: TastingRow): TastingRow {
  return {
    ...row,
    tipo_cita: row.tipo_cita?.trim() || "tasting",
    costo: Number(row.costo ?? 0),
    costo_pagado: Boolean(row.costo_pagado),
    prueba_pagada: Boolean(row.prueba_pagada ?? row.costo_pagado),
    confirmado: Boolean(row.confirmado),
    email_invitado: row.email_invitado?.trim() || null,
  };
}

export function sortTastingsBySchedule(tastings: TastingRow[]): TastingRow[] {
  return [...tastings].sort((a, b) => {
    const dateCompare = a.fecha.localeCompare(b.fecha);
    if (dateCompare !== 0) return dateCompare;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });
}
