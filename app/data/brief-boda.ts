export type BriefBodaRow = {
  id: string;
  boda_id: string;
  vision_concepto: string | null;
  vision_colores: string | null;
  vision_ambiente: string | null;
  vision_inspiraciones: string | null;
  vision_palabras_clave: string | null;
  ceremonia_tipo: string | null;
  ceremonia_celebrante: string | null;
  ceremonia_musica: string | null;
  ceremonia_inspiracion: string | null;
  coctel_duracion: string | null;
  coctel_ambiente: string | null;
  coctel_musica: string | null;
  coctel_estaciones: string | null;
  recepcion_mesas: string | null;
  recepcion_iluminacion: string | null;
  recepcion_musica: string | null;
  recepcion_primer_baile: string | null;
  recepcion_baile_padres: string | null;
  recepcion_canciones_no: string | null;
  recepcion_hora_loca: string | null;
  catering_tipo_servicio: string | null;
  catering_menu: string | null;
  catering_restricciones: string | null;
  catering_torta: string | null;
  catering_cocteleria: string | null;
  catering_estacion_cafe: string | null;
  foto_estilo: string | null;
  foto_momentos_clave: string | null;
  foto_no_quieren: string | null;
  foto_album: boolean;
  foto_drone: boolean;
  foto_video: string | null;
  decoracion_estilo: string | null;
  decoracion_flores: string | null;
  decoracion_colores: string | null;
  decoracion_elementos: string | null;
  extras_photobooth: string | null;
  extras_hora_loca: string | null;
  extras_cafe: string | null;
  extras_otros: string | null;
  logistica_transporte_novios: string | null;
  logistica_transporte_invitados: string | null;
  logistica_hotel: string | null;
  restricciones: string | null;
  updated_at: string;
  created_at: string;
};

export type BriefBodaFormData = Omit<
  BriefBodaRow,
  "id" | "boda_id" | "updated_at" | "created_at"
>;

export const EMPTY_BRIEF_FORM: BriefBodaFormData = {
  vision_concepto: null,
  vision_colores: null,
  vision_ambiente: null,
  vision_inspiraciones: null,
  vision_palabras_clave: null,
  ceremonia_tipo: null,
  ceremonia_celebrante: null,
  ceremonia_musica: null,
  ceremonia_inspiracion: null,
  coctel_duracion: null,
  coctel_ambiente: null,
  coctel_musica: null,
  coctel_estaciones: null,
  recepcion_mesas: null,
  recepcion_iluminacion: null,
  recepcion_musica: null,
  recepcion_primer_baile: null,
  recepcion_baile_padres: null,
  recepcion_canciones_no: null,
  recepcion_hora_loca: null,
  catering_tipo_servicio: null,
  catering_menu: null,
  catering_restricciones: null,
  catering_torta: null,
  catering_cocteleria: null,
  catering_estacion_cafe: null,
  foto_estilo: null,
  foto_momentos_clave: null,
  foto_no_quieren: null,
  foto_album: false,
  foto_drone: false,
  foto_video: null,
  decoracion_estilo: null,
  decoracion_flores: null,
  decoracion_colores: null,
  decoracion_elementos: null,
  extras_photobooth: null,
  extras_hora_loca: null,
  extras_cafe: null,
  extras_otros: null,
  logistica_transporte_novios: null,
  logistica_transporte_invitados: null,
  logistica_hotel: null,
  restricciones: null,
};

export function briefRowToFormData(row: BriefBodaRow): BriefBodaFormData {
  const { id: _id, boda_id: _bodaId, updated_at: _u, created_at: _c, ...form } =
    row;
  return form;
}
