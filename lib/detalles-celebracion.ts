import type { DetallesCelebracionFormData } from "@/app/data/detalles-celebracion";
import type { ClienteLocale } from "@/lib/cliente-i18n";

export type DetallesCelebracionFieldDef = {
  key: keyof DetallesCelebracionFormData;
  labelEs: string;
  labelEn: string;
};

export const DETALLES_CELEBRACION_FIELDS: DetallesCelebracionFieldDef[] = [
  {
    key: "cancion_ingreso_novio",
    labelEs: "Canción ingreso a la ceremonia novio",
    labelEn: "Groom's ceremony entrance song",
  },
  {
    key: "cancion_ingreso_novia",
    labelEs: "Canción ingreso a la ceremonia novia",
    labelEn: "Bride's ceremony entrance song",
  },
  {
    key: "cancion_primer_beso",
    labelEs: "Canción primer beso",
    labelEn: "First kiss song",
  },
  {
    key: "cancion_salida",
    labelEs: "Canción salida ceremonia",
    labelEn: "Ceremony exit song",
  },
  {
    key: "cancion_ingreso_fiesta",
    labelEs: "Canción ingreso a la fiesta",
    labelEn: "Reception entrance song",
  },
  {
    key: "palabras_brindis",
    labelEs: "¿Quiénes dirán las palabras durante el brindis?",
    labelEn: "Who will give the toast speeches?",
  },
  {
    key: "protocolo_ingreso_ceremonia",
    labelEs: "¿Cómo será el protocolo de ingreso a la ceremonia?",
    labelEn: "How will the ceremony entrance protocol work?",
  },
  {
    key: "cancion_primer_baile",
    labelEs: "Canción primer baile",
    labelEn: "First dance song",
  },
  {
    key: "cancion_baile_padres",
    labelEs: "Canción baile con papás (novia y novio)",
    labelEn: "Parent dance song (bride and groom)",
  },
];

export function getDetallesCelebracionFieldLabel(
  field: DetallesCelebracionFieldDef,
  locale: ClienteLocale,
): string {
  return locale === "en" ? field.labelEn : field.labelEs;
}

export function parseDetallesCelebracionBody(
  body: unknown,
): DetallesCelebracionFormData | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  const readField = (key: keyof DetallesCelebracionFormData) => {
    const value = record[key];
    if (value == null) return "";
    if (typeof value !== "string") return null;
    return value.slice(0, 5000);
  };

  const form = {} as DetallesCelebracionFormData;

  for (const field of DETALLES_CELEBRACION_FIELDS) {
    const value = readField(field.key);
    if (value === null) return null;
    form[field.key] = value;
  }

  return form;
}
