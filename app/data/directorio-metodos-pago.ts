import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildEspejoFromMetodo,
  metodoPagoInputFromLegacyColumns,
  metodoPagoInputFromRow,
  replaceProveedorMetodosPago,
  type ProveedorEspejoMetodoPago,
  type ProveedorMetodoPagoInput,
  type ProveedorMetodoPagoRow,
} from "@/app/data/proveedor-metodos-pago";

export type DirectorioMetodoPagoRow = Omit<ProveedorMetodoPagoRow, "proveedor_id"> & {
  directorio_proveedor_id: string;
};

export type DirectorioEspejoMetodoPago = {
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular: string | null;
  documento_nit: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function parseRecargo(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function toDbPayload(input: ProveedorMetodoPagoInput) {
  return {
    tipo: trimOrNull(input.tipo) ?? "Otro",
    banco: trimOrNull(input.banco),
    tipo_cuenta: trimOrNull(input.tipo_cuenta),
    numero_cuenta: trimOrNull(input.numero_cuenta),
    titular: trimOrNull(input.titular),
    documento_titular: trimOrNull(input.documento_titular),
    recargo_porcentaje: parseRecargo(input.recargo_porcentaje),
    notas: trimOrNull(input.notas),
    es_principal: Boolean(input.es_principal),
  };
}

function espejoDirectorio(
  espejo: ProveedorEspejoMetodoPago,
): DirectorioEspejoMetodoPago {
  return {
    banco: espejo.banco,
    tipo_cuenta: espejo.tipo_cuenta,
    numero_cuenta: espejo.numero_cuenta,
    titular: espejo.titular_cuenta,
    documento_nit: espejo.documento_nit,
  };
}

export function asProveedorMetodoRow(
  row: DirectorioMetodoPagoRow,
): ProveedorMetodoPagoRow {
  return {
    ...row,
    proveedor_id: row.directorio_proveedor_id,
  };
}

export async function listDirectorioMetodosPago(
  client: SupabaseClient,
  directorioProveedorId: string,
): Promise<{ data: DirectorioMetodoPagoRow[]; error: string | null }> {
  const { data, error } = await client
    .from("directorio_metodos_pago")
    .select("*")
    .eq("directorio_proveedor_id", directorioProveedorId)
    .order("es_principal", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as DirectorioMetodoPagoRow[], error: null };
}

export async function syncDirectorioEspejoMetodoPrincipal(
  client: SupabaseClient,
  directorioProveedorId: string,
): Promise<{
  espejo: DirectorioEspejoMetodoPago;
  error: string | null;
}> {
  const { data: rows, error: listError } = await client
    .from("directorio_metodos_pago")
    .select(
      "banco, tipo_cuenta, numero_cuenta, titular, documento_titular, es_principal, created_at",
    )
    .eq("directorio_proveedor_id", directorioProveedorId)
    .order("es_principal", { ascending: false })
    .order("created_at", { ascending: true });

  if (listError) {
    return {
      espejo: espejoDirectorio(buildEspejoFromMetodo(null)),
      error: listError.message,
    };
  }

  const list = (rows ?? []) as Array<
    Pick<
      ProveedorMetodoPagoRow,
      | "banco"
      | "tipo_cuenta"
      | "numero_cuenta"
      | "titular"
      | "documento_titular"
      | "es_principal"
    >
  >;
  const principal = list.find((row) => row.es_principal) ?? list[0] ?? null;
  const espejo = espejoDirectorio(buildEspejoFromMetodo(principal));

  const { error: updateError } = await client
    .from("directorio_proveedores")
    .update(espejo)
    .eq("id", directorioProveedorId);

  if (updateError) return { espejo, error: updateError.message };
  return { espejo, error: null };
}

async function ensureSinglePrincipal(
  client: SupabaseClient,
  directorioProveedorId: string,
  principalId: string,
): Promise<string | null> {
  const { error } = await client
    .from("directorio_metodos_pago")
    .update({ es_principal: false })
    .eq("directorio_proveedor_id", directorioProveedorId)
    .neq("id", principalId);
  return error?.message ?? null;
}

async function ensureAtLeastOnePrincipal(
  client: SupabaseClient,
  directorioProveedorId: string,
): Promise<string | null> {
  const { data, error } = await listDirectorioMetodosPago(
    client,
    directorioProveedorId,
  );
  if (error) return error;
  if (data.length === 0) return null;
  if (data.some((row) => row.es_principal)) return null;

  const { error: updateError } = await client
    .from("directorio_metodos_pago")
    .update({ es_principal: true })
    .eq("id", data[0].id);
  return updateError?.message ?? null;
}

export async function insertDirectorioMetodoPago(
  client: SupabaseClient,
  directorioProveedorId: string,
  input: ProveedorMetodoPagoInput,
): Promise<{
  row: DirectorioMetodoPagoRow | null;
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const payload = toDbPayload(input);
  const { data: existing } = await listDirectorioMetodosPago(
    client,
    directorioProveedorId,
  );
  const makePrincipal = payload.es_principal || existing.length === 0;

  const { data, error } = await client
    .from("directorio_metodos_pago")
    .insert({
      directorio_proveedor_id: directorioProveedorId,
      ...payload,
      es_principal: makePrincipal,
    })
    .select("*")
    .single();

  if (error) return { row: null, espejo: null, error: error.message };

  const row = data as DirectorioMetodoPagoRow;
  if (makePrincipal) {
    const clearError = await ensureSinglePrincipal(
      client,
      directorioProveedorId,
      row.id,
    );
    if (clearError) return { row, espejo: null, error: clearError };
  }

  const { espejo, error: syncError } = await syncDirectorioEspejoMetodoPrincipal(
    client,
    directorioProveedorId,
  );
  return {
    row,
    espejo: espejo
      ? {
          banco: espejo.banco,
          tipo_cuenta: espejo.tipo_cuenta,
          numero_cuenta: espejo.numero_cuenta,
          titular_cuenta: espejo.titular,
          documento_nit: espejo.documento_nit,
        }
      : null,
    error: syncError,
  };
}

export async function updateDirectorioMetodoPago(
  client: SupabaseClient,
  directorioProveedorId: string,
  metodoId: string,
  input: ProveedorMetodoPagoInput,
): Promise<{
  row: DirectorioMetodoPagoRow | null;
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const payload = toDbPayload(input);
  const { data, error } = await client
    .from("directorio_metodos_pago")
    .update(payload)
    .eq("id", metodoId)
    .eq("directorio_proveedor_id", directorioProveedorId)
    .select("*")
    .single();

  if (error) return { row: null, espejo: null, error: error.message };

  const row = data as DirectorioMetodoPagoRow;
  if (payload.es_principal) {
    const clearError = await ensureSinglePrincipal(
      client,
      directorioProveedorId,
      row.id,
    );
    if (clearError) return { row, espejo: null, error: clearError };
  } else {
    const ensureError = await ensureAtLeastOnePrincipal(
      client,
      directorioProveedorId,
    );
    if (ensureError) return { row, espejo: null, error: ensureError };
  }

  const synced = await syncDirectorioEspejoMetodoPrincipal(
    client,
    directorioProveedorId,
  );
  return {
    row,
    espejo: {
      banco: synced.espejo.banco,
      tipo_cuenta: synced.espejo.tipo_cuenta,
      numero_cuenta: synced.espejo.numero_cuenta,
      titular_cuenta: synced.espejo.titular,
      documento_nit: synced.espejo.documento_nit,
    },
    error: synced.error,
  };
}

export async function deleteDirectorioMetodoPago(
  client: SupabaseClient,
  directorioProveedorId: string,
  metodoId: string,
): Promise<{
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const { error } = await client
    .from("directorio_metodos_pago")
    .delete()
    .eq("id", metodoId)
    .eq("directorio_proveedor_id", directorioProveedorId);

  if (error) return { espejo: null, error: error.message };

  const ensureError = await ensureAtLeastOnePrincipal(
    client,
    directorioProveedorId,
  );
  if (ensureError) return { espejo: null, error: ensureError };

  const synced = await syncDirectorioEspejoMetodoPrincipal(
    client,
    directorioProveedorId,
  );
  return {
    espejo: {
      banco: synced.espejo.banco,
      tipo_cuenta: synced.espejo.tipo_cuenta,
      numero_cuenta: synced.espejo.numero_cuenta,
      titular_cuenta: synced.espejo.titular,
      documento_nit: synced.espejo.documento_nit,
    },
    error: synced.error,
  };
}

export async function setDirectorioMetodoPagoPrincipal(
  client: SupabaseClient,
  directorioProveedorId: string,
  metodoId: string,
): Promise<{
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const { error: setError } = await client
    .from("directorio_metodos_pago")
    .update({ es_principal: true })
    .eq("id", metodoId)
    .eq("directorio_proveedor_id", directorioProveedorId);

  if (setError) return { espejo: null, error: setError.message };

  const clearError = await ensureSinglePrincipal(
    client,
    directorioProveedorId,
    metodoId,
  );
  if (clearError) return { espejo: null, error: clearError };

  const synced = await syncDirectorioEspejoMetodoPrincipal(
    client,
    directorioProveedorId,
  );
  return {
    espejo: {
      banco: synced.espejo.banco,
      tipo_cuenta: synced.espejo.tipo_cuenta,
      numero_cuenta: synced.espejo.numero_cuenta,
      titular_cuenta: synced.espejo.titular,
      documento_nit: synced.espejo.documento_nit,
    },
    error: synced.error,
  };
}

export async function replaceDirectorioMetodosPago(
  client: SupabaseClient,
  directorioProveedorId: string,
  inputs: ProveedorMetodoPagoInput[],
): Promise<{
  espejo: DirectorioEspejoMetodoPago;
  error: string | null;
}> {
  const { error: deleteError } = await client
    .from("directorio_metodos_pago")
    .delete()
    .eq("directorio_proveedor_id", directorioProveedorId);
  if (deleteError) {
    return {
      espejo: espejoDirectorio(buildEspejoFromMetodo(null)),
      error: deleteError.message,
    };
  }

  if (inputs.length === 0) {
    return syncDirectorioEspejoMetodoPrincipal(client, directorioProveedorId);
  }

  let principalIndex = inputs.findIndex((item) => item.es_principal);
  if (principalIndex < 0) principalIndex = 0;

  const rows = inputs.map((input, index) => ({
    directorio_proveedor_id: directorioProveedorId,
    ...toDbPayload({ ...input, es_principal: index === principalIndex }),
  }));

  const { error: insertError } = await client
    .from("directorio_metodos_pago")
    .insert(rows);
  if (insertError) {
    return {
      espejo: espejoDirectorio(buildEspejoFromMetodo(null)),
      error: insertError.message,
    };
  }

  return syncDirectorioEspejoMetodoPrincipal(client, directorioProveedorId);
}

/** Copia todos los métodos del directorio al proveedor de boda recién creado. */
export async function copyDirectorioMetodosToProveedor(
  client: SupabaseClient,
  directorioProveedorId: string,
  proveedorId: string,
  legacy?: {
    banco?: string | null;
    tipo_cuenta?: string | null;
    numero_cuenta?: string | null;
    titular?: string | null;
    documento_nit?: string | null;
  },
): Promise<{ error: string | null }> {
  const { data, error } = await listDirectorioMetodosPago(
    client,
    directorioProveedorId,
  );
  if (error) return { error };

  const inputs =
    data.length > 0
      ? data.map((row) => metodoPagoInputFromRow(asProveedorMetodoRow(row)))
      : (() => {
          const fromLegacy = legacy
            ? metodoPagoInputFromLegacyColumns(legacy)
            : null;
          return fromLegacy ? [fromLegacy] : [];
        })();

  if (inputs.length === 0) return { error: null };

  const result = await replaceProveedorMetodosPago(client, proveedorId, inputs);
  return { error: result.error };
}

export const directorioMetodosPagoApi = {
  list: async (client: SupabaseClient, directorioProveedorId: string) => {
    const result = await listDirectorioMetodosPago(client, directorioProveedorId);
    return {
      data: result.data.map(asProveedorMetodoRow),
      error: result.error,
    };
  },
  insert: insertDirectorioMetodoPago,
  update: updateDirectorioMetodoPago,
  remove: deleteDirectorioMetodoPago,
  setPrincipal: setDirectorioMetodoPagoPrincipal,
};
