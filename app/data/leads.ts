export type LeadSeguimientoStatus = "nuevo" | "en_conversacion" | "perdido";

export type LeadListadoEstado = "activo" | "descartado";

export type LeadRow = {
  id: string;
  nombre_pareja: string;
  fecha_tentativa: string | null;
  ciudad: string | null;
  presupuesto_estimado: number | null;
  cantidad_invitados: number | null;
  tipo_ceremonia: string | null;
  pais_origen_novios: string | null;
  ciudad_residencia_actual: string | null;
  concepto_boda: string | null;
  prioridades: string | null;
  como_nos_conocieron: string | null;
  /** Seguimiento comercial: nuevo, en conversación, perdido. */
  estado_seguimiento: LeadSeguimientoStatus;
  /** Visibilidad en el dashboard: activo o descartado. */
  estado: LeadListadoEstado;
  notas: string | null;
  honorarios_acordados: number | null;
  anticipo_acordado: number | null;
  lugar_venue: string | null;
  telefono: string | null;
  email: string | null;
  created_at: string;
};

/** @deprecated Use LeadSeguimientoStatus */
export type LeadStatus = LeadSeguimientoStatus;

export const LEAD_SEGUIMIENTO_LABELS: Record<LeadSeguimientoStatus, string> = {
  nuevo: "Nuevo",
  en_conversacion: "En conversación",
  perdido: "Perdido",
};

export const LEAD_SEGUIMIENTO_STYLES: Record<LeadSeguimientoStatus, string> = {
  nuevo: "bg-blue-100 text-blue-800",
  en_conversacion: "bg-yellow-100 text-yellow-800",
  perdido: "bg-red-100 text-red-800",
};

export const LEAD_LISTADO_LABELS: Record<LeadListadoEstado, string> = {
  activo: "Activo",
  descartado: "Descartado",
};

/** @deprecated Use LEAD_SEGUIMIENTO_LABELS */
export const LEAD_STATUS_LABELS = LEAD_SEGUIMIENTO_LABELS;

/** @deprecated Use LEAD_SEGUIMIENTO_STYLES */
export const LEAD_STATUS_STYLES = LEAD_SEGUIMIENTO_STYLES;
