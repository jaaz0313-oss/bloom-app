export type CitaTipo =
  | "primera_reunion"
  | "reunion_seguimiento"
  | "reunion_proveedor"
  | "reunion_planificacion";

export type CitaEstado =
  | "programada"
  | "confirmada"
  | "cancelada"
  | "realizada";

export type CitaRow = {
  id: string;
  tipo: CitaTipo;
  titulo: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  lugar: string | null;
  link_meet: string | null;
  notas: string | null;
  boda_id: string | null;
  lead_id: string | null;
  asignado_a: string | null;
  asignado_nombre: string | null;
  proveedor_id: string | null;
  emails_involucrados: string[] | null;
  estado: CitaEstado;
  confirmada: boolean;
  google_event_id: string | null;
  google_meet_link: string | null;
  created_by: string | null;
  created_at: string;
};

export const CITA_TIPO_LABELS: Record<CitaTipo, string> = {
  primera_reunion: "Primera reunión",
  reunion_seguimiento: "Reunión de seguimiento",
  reunion_proveedor: "Reunión con proveedor",
  reunion_planificacion: "Reunión de planificación",
};

export const CITA_TIPO_STYLES: Record<CitaTipo, string> = {
  primera_reunion: "bg-violet-100 text-violet-900 border-violet-200",
  reunion_seguimiento: "bg-sky-100 text-sky-900 border-sky-200",
  reunion_proveedor: "bg-amber-100 text-amber-900 border-amber-200",
  reunion_planificacion: "bg-emerald-100 text-emerald-900 border-emerald-200",
};

export const CITA_TIPO_DOT_STYLES: Record<CitaTipo, string> = {
  primera_reunion: "bg-violet-500",
  reunion_seguimiento: "bg-sky-500",
  reunion_proveedor: "bg-amber-500",
  reunion_planificacion: "bg-emerald-500",
};

export const CITA_ESTADO_LABELS: Record<CitaEstado, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  realizada: "Realizada",
};

export const CITA_ESTADO_STYLES: Record<CitaEstado, string> = {
  programada: "bg-slate-100 text-slate-700 border-slate-200",
  confirmada: "bg-green-100 text-green-800 border-green-200",
  cancelada: "bg-red-100 text-red-800 border-red-200",
  realizada: "bg-bloom-canvas text-bloom-muted border-bloom-border",
};

export const CITA_TIPOS: CitaTipo[] = [
  "primera_reunion",
  "reunion_seguimiento",
  "reunion_proveedor",
  "reunion_planificacion",
];
