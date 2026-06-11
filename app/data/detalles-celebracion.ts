export type DetallesCelebracionRow = {
  id: string;
  boda_id: string;
  cancion_ingreso_novio: string | null;
  cancion_ingreso_novia: string | null;
  cancion_primer_beso: string | null;
  cancion_salida: string | null;
  cancion_ingreso_fiesta: string | null;
  palabras_brindis: string | null;
  protocolo_ingreso_ceremonia: string | null;
  cancion_primer_baile: string | null;
  cancion_baile_padres: string | null;
  updated_at: string;
};

export type DetallesCelebracionFormData = {
  cancion_ingreso_novio: string;
  cancion_ingreso_novia: string;
  cancion_primer_beso: string;
  cancion_salida: string;
  cancion_ingreso_fiesta: string;
  palabras_brindis: string;
  protocolo_ingreso_ceremonia: string;
  cancion_primer_baile: string;
  cancion_baile_padres: string;
};

export const DETALLES_CELEBRACION_FIELD_KEYS = [
  "cancion_ingreso_novio",
  "cancion_ingreso_novia",
  "cancion_primer_beso",
  "cancion_salida",
  "cancion_ingreso_fiesta",
  "palabras_brindis",
  "protocolo_ingreso_ceremonia",
  "cancion_primer_baile",
  "cancion_baile_padres",
] as const satisfies readonly (keyof DetallesCelebracionFormData)[];

export const EMPTY_DETALLES_CELEBRACION_FORM: DetallesCelebracionFormData = {
  cancion_ingreso_novio: "",
  cancion_ingreso_novia: "",
  cancion_primer_beso: "",
  cancion_salida: "",
  cancion_ingreso_fiesta: "",
  palabras_brindis: "",
  protocolo_ingreso_ceremonia: "",
  cancion_primer_baile: "",
  cancion_baile_padres: "",
};

export function detallesCelebracionRowToForm(
  row: DetallesCelebracionRow | null,
): DetallesCelebracionFormData {
  if (!row) {
    return { ...EMPTY_DETALLES_CELEBRACION_FORM };
  }

  return {
    cancion_ingreso_novio: row.cancion_ingreso_novio ?? "",
    cancion_ingreso_novia: row.cancion_ingreso_novia ?? "",
    cancion_primer_beso: row.cancion_primer_beso ?? "",
    cancion_salida: row.cancion_salida ?? "",
    cancion_ingreso_fiesta: row.cancion_ingreso_fiesta ?? "",
    palabras_brindis: row.palabras_brindis ?? "",
    protocolo_ingreso_ceremonia: row.protocolo_ingreso_ceremonia ?? "",
    cancion_primer_baile: row.cancion_primer_baile ?? "",
    cancion_baile_padres: row.cancion_baile_padres ?? "",
  };
}

export function detallesCelebracionFormToPayload(
  form: DetallesCelebracionFormData,
): Omit<DetallesCelebracionRow, "id" | "boda_id" | "updated_at"> {
  const normalize = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    cancion_ingreso_novio: normalize(form.cancion_ingreso_novio),
    cancion_ingreso_novia: normalize(form.cancion_ingreso_novia),
    cancion_primer_beso: normalize(form.cancion_primer_beso),
    cancion_salida: normalize(form.cancion_salida),
    cancion_ingreso_fiesta: normalize(form.cancion_ingreso_fiesta),
    palabras_brindis: normalize(form.palabras_brindis),
    protocolo_ingreso_ceremonia: normalize(form.protocolo_ingreso_ceremonia),
    cancion_primer_baile: normalize(form.cancion_primer_baile),
    cancion_baile_padres: normalize(form.cancion_baile_padres),
  };
}

export function hasDetallesCelebracionContent(
  row: DetallesCelebracionRow | null,
): boolean {
  if (!row) return false;

  return DETALLES_CELEBRACION_FIELD_KEYS.some((key) => {
    const value = row[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function countDetallesCelebracionFilledFields(
  form: DetallesCelebracionFormData,
): number {
  return DETALLES_CELEBRACION_FIELD_KEYS.filter(
    (key) => form[key].trim().length > 0,
  ).length;
}
