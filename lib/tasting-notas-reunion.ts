import type { SupabaseClient } from "@supabase/supabase-js";

export type TastingNotaReunionEntry = {
  id: string;
  texto: string;
  fecha: string;
  autor: string;
  autorId: string | null;
  /** Id en `notas_reunion` si ya se sincronizó / creó allí. */
  notaReunionId?: string | null;
};

function createLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeNotaEntry(item: unknown): TastingNotaReunionEntry | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;
  const texto =
    typeof row.texto === "string"
      ? row.texto.trim()
      : typeof row.resumen === "string"
        ? row.resumen.trim()
        : "";
  if (!texto) return null;
  return {
    id: typeof row.id === "string" && row.id ? row.id : createLocalId(),
    texto,
    fecha:
      typeof row.fecha === "string" && row.fecha
        ? row.fecha
        : new Date().toISOString(),
    autor:
      typeof row.autor === "string" && row.autor.trim()
        ? row.autor.trim()
        : "Sin autor",
    autorId:
      typeof row.autorId === "string" && row.autorId ? row.autorId : null,
    notaReunionId:
      typeof row.notaReunionId === "string" && row.notaReunionId
        ? row.notaReunionId
        : null,
  };
}

/**
 * Normaliza `tastings.notas_reunion` (jsonb array, string JSON o null) a un array.
 */
export function parseTastingNotasReunion(
  raw: unknown,
): TastingNotaReunionEntry[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw
      .map(normalizeNotaEntry)
      .filter((item): item is TastingNotaReunionEntry => item != null);
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map(normalizeNotaEntry)
          .filter((item): item is TastingNotaReunionEntry => item != null);
      }
      return [];
    } catch {
      return [
        {
          id: createLocalId(),
          texto: trimmed,
          fecha: new Date().toISOString(),
          autor: "Sin autor",
          autorId: null,
        },
      ];
    }
  }

  return [];
}

/** Valor a persistir en jsonb: array de notas, o null si está vacío. */
export function serializeTastingNotasReunion(
  entries: TastingNotaReunionEntry[],
): TastingNotaReunionEntry[] | null {
  if (entries.length === 0) return null;
  return entries;
}

export function appendTastingNotaReunion(
  raw: unknown,
  entry: Omit<TastingNotaReunionEntry, "id"> & { id?: string },
): TastingNotaReunionEntry[] {
  const current = parseTastingNotasReunion(raw);
  return [
    ...current,
    {
      id: entry.id ?? createLocalId(),
      texto: entry.texto.trim(),
      fecha: entry.fecha,
      autor: entry.autor.trim() || "Sin autor",
      autorId: entry.autorId,
      notaReunionId: entry.notaReunionId ?? null,
    },
  ];
}

export function updateTastingNotaReunion(
  raw: unknown,
  notaId: string,
  texto: string,
): TastingNotaReunionEntry[] {
  const trimmed = texto.trim();
  return parseTastingNotasReunion(raw).map((entry) =>
    entry.id === notaId ? { ...entry, texto: trimmed } : entry,
  );
}

/**
 * Copia notas guardadas en citas (tastings.notas_reunion) hacia
 * `notas_reunion` del proveedor al pasar a contratado.
 */
export async function syncTastingNotasReunionToProveedor(
  client: SupabaseClient,
  params: {
    bodaId: string;
    proveedorId: string;
    proveedorNombre: string;
    currentUserId?: string | null;
    currentUserNombre?: string | null;
  },
): Promise<void> {
  const { data, error } = await client
    .from("tastings")
    .select("id, notas_reunion, nombre_proveedor")
    .eq("boda_id", params.bodaId)
    .eq("proveedor_id", params.proveedorId);

  if (error) {
    console.error("[syncTastingNotasReunionToProveedor]", error);
    return;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    notas_reunion: unknown;
    nombre_proveedor: string;
  }>;

  for (const tasting of rows) {
    const entries = parseTastingNotasReunion(tasting.notas_reunion);
    if (entries.length === 0) continue;

    let changed = false;
    const nextEntries: TastingNotaReunionEntry[] = [];

    for (const entry of entries) {
      if (entry.notaReunionId) {
        nextEntries.push(entry);
        continue;
      }

      const { data: inserted, error: insertError } = await client
        .from("notas_reunion")
        .insert({
          boda_id: params.bodaId,
          proveedor_id: params.proveedorId,
          fecha: entry.fecha,
          con_quien:
            params.proveedorNombre.trim() ||
            tasting.nombre_proveedor.trim() ||
            "Proveedor",
          resumen: entry.texto,
          creado_por: entry.autorId ?? params.currentUserId ?? null,
          creado_por_nombre:
            entry.autor.trim() ||
            params.currentUserNombre?.trim() ||
            null,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(
          "[syncTastingNotasReunionToProveedor] insert",
          insertError,
        );
        nextEntries.push(entry);
        continue;
      }

      changed = true;
      nextEntries.push({
        ...entry,
        notaReunionId: (inserted as { id: string }).id,
      });
    }

    if (!changed) continue;

    const { error: updateError } = await client
      .from("tastings")
      .update({
        notas_reunion: serializeTastingNotasReunion(nextEntries),
      })
      .eq("id", tasting.id);

    if (updateError) {
      console.error(
        "[syncTastingNotasReunionToProveedor] update tasting",
        updateError,
      );
    }
  }
}
