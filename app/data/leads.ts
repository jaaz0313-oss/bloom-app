export type LeadStatus = "nuevo" | "en_conversacion" | "perdido";

export type LeadRow = {
  id: string;
  nombre_pareja: string;
  fecha_tentativa: string;
  ciudad: string;
  presupuesto_estimado: number | null;
  cantidad_invitados: number | null;
  tipo_ceremonia: string | null;
  pais_origen_novios: string | null;
  ciudad_residencia_actual: string | null;
  concepto_boda: string | null;
  prioridades: string | null;
  estado: LeadStatus;
  notas: string | null;
  honorarios_acordados: number | null;
  anticipo_acordado: number | null;
  lugar_venue: string | null;
  telefono: string | null;
  email: string | null;
  created_at: string;
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  en_conversacion: "En conversación",
  perdido: "Perdido",
};

export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  nuevo: "bg-blue-100 text-blue-800",
  en_conversacion: "bg-yellow-100 text-yellow-800",
  perdido: "bg-red-100 text-red-800",
};

