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
  { categoria: "Website", descripcion: "Website", mesesAntes: 11 },
  {
    categoria: "Belleza",
    descripcion: "Maquillaje y peinado",
    mesesAntes: 11,
  },
  { categoria: "Ceremonia", descripcion: "Oficiante", mesesAntes: 10 },
  { categoria: "Fotografía", descripcion: "Fotografía", mesesAntes: 10 },
  { categoria: "Video", descripcion: "Video", mesesAntes: 10 },
  { categoria: "DJ", descripcion: "DJ", mesesAntes: 10 },
  { categoria: "Banda", descripcion: "Banda", mesesAntes: 10 },
  {
    categoria: "Entretenimiento",
    descripcion: "Entretenimiento",
    mesesAntes: 10,
  },
  { categoria: "Decoración", descripcion: "Decoración", mesesAntes: 9 },
  { categoria: "Producción", descripcion: "Producción", mesesAntes: 8 },
  {
    categoria: "Músicos de ceremonia",
    descripcion: "Músicos de ceremonia",
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
  { categoria: "Ambulancia", descripcion: "Ambulancia", mesesAntes: 3 },
  { categoria: "Logística", descripcion: "Seating chart", mesesAntes: 1 },
  { categoria: "Logística", descripcion: "Timing", mesesAntes: 1 },
  { categoria: "Otros", descripcion: "Otros", mesesAntes: 1 },
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

function cronogramaItemKey(categoria: string, descripcion: string): string {
  return `${categoria.trim().toLowerCase()}|${descripcion.trim().toLowerCase()}`;
}

function normalizeCronogramaDescripcion(descripcion: string): string {
  return descripcion.trim().toLowerCase();
}

type CronogramaItemExisting = {
  id: string;
  categoria: string;
  descripcion: string;
};

type ObsoleteHitoRule = {
  matches: (descripcion: string) => boolean;
  requiredSeparateDescripciones: string[];
};

const OBSOLETE_HITO_RULES: ObsoleteHitoRule[] = [
  {
    matches: (descripcion) =>
      /^fotograf[ií]a\s+y\s+video$/i.test(descripcion.trim()),
    requiredSeparateDescripciones: ["Fotografía", "Video"],
  },
  {
    matches: (descripcion) =>
      /^dj\s*\/\s*banda\s*\/\s*entretenimiento$/i.test(descripcion.trim()),
    requiredSeparateDescripciones: ["DJ", "Banda", "Entretenimiento"],
  },
];

function findObsoleteHitoIds(items: CronogramaItemExisting[]): string[] {
  const descripciones = new Set(
    items.map((item) => normalizeCronogramaDescripcion(item.descripcion)),
  );

  const idsToDelete = new Set<string>();

  for (const item of items) {
    for (const rule of OBSOLETE_HITO_RULES) {
      if (!rule.matches(item.descripcion)) continue;

      const allSeparatesPresent = rule.requiredSeparateDescripciones.every(
        (descripcion) =>
          descripciones.has(normalizeCronogramaDescripcion(descripcion)),
      );

      if (allSeparatesPresent) {
        idsToDelete.add(item.id);
      }
    }
  }

  return [...idsToDelete];
}

/** Agrega hitos de la plantilla actual que aún no existen en el cronograma de la boda. */
export async function actualizarCronograma(
  client: SupabaseClient,
  bodaId: string,
  fechaBoda: string,
): Promise<
  { ok: true; added: number; removed: number } | { ok: false; message: string }
> {
  const { data: existing, error: fetchError } = await client
    .from("cronograma_items")
    .select("id, categoria, descripcion")
    .eq("boda_id", bodaId);

  if (fetchError) {
    return { ok: false, message: fetchError.message };
  }

  const existingRows = (existing ?? []) as CronogramaItemExisting[];
  const existingKeys = new Set(
    existingRows.map((row) => cronogramaItemKey(row.categoria, row.descripcion)),
  );

  const plantilla = generarCronograma(bodaId, fechaBoda);
  const nuevos = plantilla.filter(
    (item) =>
      !existingKeys.has(cronogramaItemKey(item.categoria, item.descripcion)),
  );

  if (nuevos.length > 0) {
    const { error: insertError } = await client
      .from("cronograma_items")
      .insert(nuevos);

    if (insertError) {
      return { ok: false, message: insertError.message };
    }
  }

  const { data: refreshed, error: refreshError } = await client
    .from("cronograma_items")
    .select("id, categoria, descripcion")
    .eq("boda_id", bodaId);

  if (refreshError) {
    return { ok: false, message: refreshError.message };
  }

  const obsoleteIds = findObsoleteHitoIds(
    (refreshed ?? []) as CronogramaItemExisting[],
  );

  if (obsoleteIds.length > 0) {
    const { error: deleteError } = await client
      .from("cronograma_items")
      .delete()
      .in("id", obsoleteIds);

    if (deleteError) {
      return { ok: false, message: deleteError.message };
    }
  }

  return { ok: true, added: nuevos.length, removed: obsoleteIds.length };
}
