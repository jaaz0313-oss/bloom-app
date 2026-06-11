export type TastingRow = {
  id: string;
  boda_id: string;
  proveedor_id: string | null;
  nombre_proveedor: string;
  categoria: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  direccion: string | null;
  costo: number;
  costo_pagado: boolean;
  asignado_a: string | null;
  asignado_nombre: string | null;
  confirmado: boolean;
  notas: string | null;
  google_event_id: string | null;
  created_at: string;
};

export function normalizeTastingRow(row: TastingRow): TastingRow {
  return {
    ...row,
    costo: Number(row.costo ?? 0),
    costo_pagado: Boolean(row.costo_pagado),
    confirmado: Boolean(row.confirmado),
  };
}

export function sortTastingsBySchedule(tastings: TastingRow[]): TastingRow[] {
  return [...tastings].sort((a, b) => {
    const dateCompare = a.fecha.localeCompare(b.fecha);
    if (dateCompare !== 0) return dateCompare;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });
}
