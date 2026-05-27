import type { SupabaseClient } from "@supabase/supabase-js";

type HitoTemplate = {
  categoria: string;
  descripcion: string;
  mesesAntes?: number;
  semanasAntes?: number;
};

const HITOS_PLANTILLA: HitoTemplate[] = [
  { categoria: "Venue", descripcion: "Lugar del evento", mesesAntes: 12 },
  { categoria: "Ceremonia", descripcion: "Lugar de ceremonia", mesesAntes: 12 },
  { categoria: "Papelería", descripcion: "Save the date", mesesAntes: 11 },
  {
    categoria: "Belleza",
    descripcion: "Maquillaje y peinado",
    mesesAntes: 11,
  },
  { categoria: "Ceremonia", descripcion: "Oficiante", mesesAntes: 10 },
  {
    categoria: "Fotografía",
    descripcion: "Fotografía y video",
    mesesAntes: 10,
  },
  {
    categoria: "Música",
    descripcion: "DJ / Banda / Entretenimiento",
    mesesAntes: 10,
  },
  { categoria: "Decoración", descripcion: "Decoración", mesesAntes: 9 },
  { categoria: "Producción", descripcion: "Producción", mesesAntes: 8 },
  {
    categoria: "Música",
    descripcion: "Músicos ceremonia",
    mesesAntes: 7,
  },
  { categoria: "Música", descripcion: "Músicos cóctel", mesesAntes: 7 },
  { categoria: "Catering", descripcion: "Catering", mesesAntes: 6 },
  { categoria: "Repostería", descripcion: "Repostería", mesesAntes: 6 },
  { categoria: "Bebidas", descripcion: "Coctelería", mesesAntes: 6 },
  {
    categoria: "Transporte",
    descripcion: "Carro de la novia",
    mesesAntes: 6,
  },
  {
    categoria: "Eventos",
    descripcion: "Welcome party",
    mesesAntes: 6,
  },
  { categoria: "Bebidas", descripcion: "Licor", mesesAntes: 5 },
  { categoria: "Transporte", descripcion: "Transporte", mesesAntes: 4 },
  { categoria: "Entretenimiento", descripcion: "Hora loca", mesesAntes: 3 },
  { categoria: "Entretenimiento", descripcion: "Foto cabina", mesesAntes: 3 },
  {
    categoria: "Entretenimiento",
    descripcion: "Estación de café",
    mesesAntes: 3,
  },
  { categoria: "Logística", descripcion: "Seating chart", mesesAntes: 1 },
  { categoria: "Logística", descripcion: "Timing", mesesAntes: 1 },
];

export type CronogramaItemInsert = {
  boda_id: string;
  categoria: string;
  descripcion: string;
  meses_antes: number;
  fecha_limite: string;
  completado: boolean;
};

function calcularFechaLimite(
  fechaBoda: string,
  hito: HitoTemplate,
): string {
  const fecha = new Date(fechaBoda + "T12:00:00");

  if (hito.semanasAntes != null) {
    fecha.setDate(fecha.getDate() - hito.semanasAntes * 7);
  } else if (hito.mesesAntes != null) {
    fecha.setMonth(fecha.getMonth() - hito.mesesAntes);
  }

  return fecha.toISOString().slice(0, 10);
}

export function generarCronograma(
  bodaId: string,
  fechaBoda: string,
): CronogramaItemInsert[] {
  return HITOS_PLANTILLA.map((hito) => ({
    boda_id: bodaId,
    categoria: hito.categoria,
    descripcion: hito.descripcion,
    meses_antes: hito.mesesAntes ?? 0,
    fecha_limite: calcularFechaLimite(fechaBoda, hito),
    completado: false,
  }));
}

export async function insertarCronograma(
  client: SupabaseClient,
  bodaId: string,
  fechaBoda: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const items = generarCronograma(bodaId, fechaBoda);
  const { error } = await client.from("cronograma_items").insert(items);

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

/** Temporal: borra hitos existentes y vuelve a generar con la plantilla actual. */
export async function regenerarCronograma(
  client: SupabaseClient,
  bodaId: string,
  fechaBoda: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error: deleteError } = await client
    .from("cronograma_items")
    .delete()
    .eq("boda_id", bodaId);

  if (deleteError) {
    return { ok: false, message: deleteError.message };
  }

  return insertarCronograma(client, bodaId, fechaBoda);
}
