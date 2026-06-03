export type CotizacionEstado = "borrador" | "enviada" | "aceptada" | "rechazada";

export type CotizacionRow = {
  id: string;
  lead_id: string;
  numero_invitados: number | null;
  ciudad: string | null;
  fecha_estimada: string | null;
  notas: string | null;
  estado: CotizacionEstado;
  created_by: string | null;
  created_at: string;
};

export type CotizacionItemRow = {
  id: string;
  cotizacion_id: string;
  categoria: string;
  descripcion: string | null;
  precio_estimado: number | null;
  proveedor_sugerido_id: string | null;
  notas_internas: string | null;
  incluido: boolean;
};

export const COTIZACION_ESTADO_LABELS: Record<CotizacionEstado, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
};

export const COTIZACION_ESTADOS: CotizacionEstado[] = [
  "borrador",
  "enviada",
  "aceptada",
  "rechazada",
];

export type CotizacionWithLead = CotizacionRow & {
  leads: {
    nombre_pareja: string;
    fecha_tentativa: string;
    ciudad: string;
    cantidad_invitados: number | null;
    presupuesto_estimado: number | null;
    notas: string | null;
  } | null;
};
