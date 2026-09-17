import type { SupabaseClient } from "@supabase/supabase-js";

export const TIPOS_METODO_PAGO = [
  "Transferencia bancaria",
  "Tarjeta - Bold",
  "Tarjeta - Stripe",
  "Efectivo",
  "Otro",
] as const;

export type TipoMetodoPagoProveedor = (typeof TIPOS_METODO_PAGO)[number];

export type ProveedorMetodoPagoRow = {
  id: string;
  proveedor_id: string;
  tipo: string;
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular: string | null;
  documento_titular: string | null;
  recargo_porcentaje: number | null;
  notas: string | null;
  es_principal: boolean;
  created_at: string;
};

/** Campos del formulario / borrador local (sin id ni proveedor_id). */
export type ProveedorMetodoPagoInput = {
  tipo: string;
  banco: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  titular: string;
  documento_titular: string;
  recargo_porcentaje: string;
  notas: string;
  es_principal: boolean;
};

/** Columnas legacy en `proveedores` que espejan el método principal. */
export type ProveedorEspejoMetodoPago = {
  banco: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  titular_cuenta: string | null;
  documento_nit: string | null;
};

export function emptyMetodoPagoInput(
  esPrincipal = true,
): ProveedorMetodoPagoInput {
  return {
    tipo: "Transferencia bancaria",
    banco: "",
    tipo_cuenta: "",
    numero_cuenta: "",
    titular: "",
    documento_titular: "",
    recargo_porcentaje: "",
    notas: "",
    es_principal: esPrincipal,
  };
}

function trimOrNull(value: string | null | undefined): string | null {
  const next = value?.trim() ?? "";
  return next ? next : null;
}

function parseRecargo(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(",", "."));
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

export function metodoPagoInputFromRow(
  row: ProveedorMetodoPagoRow,
): ProveedorMetodoPagoInput {
  return {
    tipo: row.tipo,
    banco: row.banco ?? "",
    tipo_cuenta: row.tipo_cuenta ?? "",
    numero_cuenta: row.numero_cuenta ?? "",
    titular: row.titular ?? "",
    documento_titular: row.documento_titular ?? "",
    recargo_porcentaje:
      row.recargo_porcentaje != null &&
      Number.isFinite(Number(row.recargo_porcentaje))
        ? String(row.recargo_porcentaje)
        : "",
    notas: row.notas ?? "",
    es_principal: Boolean(row.es_principal),
  };
}

export function metodoPagoInputFromLegacyColumns(source: {
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  titular?: string | null;
  titular_cuenta?: string | null;
  documento_nit?: string | null;
  documento_titular?: string | null;
}): ProveedorMetodoPagoInput | null {
  const banco = trimOrNull(source.banco);
  const tipoCuenta = trimOrNull(source.tipo_cuenta);
  const numeroCuenta = trimOrNull(source.numero_cuenta);
  const titular = trimOrNull(source.titular_cuenta ?? source.titular);
  const documento = trimOrNull(
    source.documento_titular ?? source.documento_nit,
  );
  if (!banco && !tipoCuenta && !numeroCuenta && !titular && !documento) {
    return null;
  }
  return {
    ...emptyMetodoPagoInput(true),
    banco: banco ?? "",
    tipo_cuenta: tipoCuenta ?? "",
    numero_cuenta: numeroCuenta ?? "",
    titular: titular ?? "",
    documento_titular: documento ?? "",
  };
}

export function buildEspejoFromMetodo(
  metodo: Pick<
    ProveedorMetodoPagoRow,
    | "banco"
    | "tipo_cuenta"
    | "numero_cuenta"
    | "titular"
    | "documento_titular"
  > | null,
): ProveedorEspejoMetodoPago {
  if (!metodo) {
    return {
      banco: null,
      tipo_cuenta: null,
      numero_cuenta: null,
      titular_cuenta: null,
      documento_nit: null,
    };
  }
  return {
    banco: trimOrNull(metodo.banco),
    tipo_cuenta: trimOrNull(metodo.tipo_cuenta),
    numero_cuenta: trimOrNull(metodo.numero_cuenta),
    titular_cuenta: trimOrNull(metodo.titular),
    documento_nit: trimOrNull(metodo.documento_titular),
  };
}

export function buildEspejoFromMetodoInput(
  metodo: ProveedorMetodoPagoInput | null,
): ProveedorEspejoMetodoPago {
  if (!metodo) return buildEspejoFromMetodo(null);
  return buildEspejoFromMetodo({
    banco: metodo.banco,
    tipo_cuenta: metodo.tipo_cuenta,
    numero_cuenta: metodo.numero_cuenta,
    titular: metodo.titular,
    documento_titular: metodo.documento_titular,
  });
}

export function summarizeMetodoPago(
  metodo: Pick<
    ProveedorMetodoPagoRow | ProveedorMetodoPagoInput,
    "tipo" | "banco" | "numero_cuenta" | "notas" | "recargo_porcentaje"
  >,
): string {
  const parts: string[] = [metodo.tipo];
  if (metodo.banco?.trim()) parts.push(metodo.banco.trim());
  if (metodo.numero_cuenta?.trim()) parts.push(metodo.numero_cuenta.trim());
  const recargo =
    typeof metodo.recargo_porcentaje === "number"
      ? metodo.recargo_porcentaje
      : parseRecargo(metodo.recargo_porcentaje);
  if (recargo != null && recargo > 0) parts.push(`recargo ${recargo}%`);
  if (metodo.notas?.trim()) parts.push(metodo.notas.trim());
  return parts.join(" · ");
}

export async function listProveedorMetodosPago(
  client: SupabaseClient,
  proveedorId: string,
): Promise<{ data: ProveedorMetodoPagoRow[]; error: string | null }> {
  const { data, error } = await client
    .from("proveedor_metodos_pago")
    .select("*")
    .eq("proveedor_id", proveedorId)
    .order("es_principal", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as ProveedorMetodoPagoRow[], error: null };
}

/**
 * Escribe en `proveedores` el espejo del método principal.
 * Si no hay métodos, limpia las columnas bancarias legacy.
 */
export async function syncProveedorEspejoMetodoPrincipal(
  client: SupabaseClient,
  proveedorId: string,
): Promise<{
  espejo: ProveedorEspejoMetodoPago;
  error: string | null;
}> {
  const { data: rows, error: listError } = await client
    .from("proveedor_metodos_pago")
    .select(
      "banco, tipo_cuenta, numero_cuenta, titular, documento_titular, es_principal, created_at",
    )
    .eq("proveedor_id", proveedorId)
    .order("es_principal", { ascending: false })
    .order("created_at", { ascending: true });

  if (listError) {
    return { espejo: buildEspejoFromMetodo(null), error: listError.message };
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
  const espejo = buildEspejoFromMetodo(principal);

  const { error: updateError } = await client
    .from("proveedores")
    .update(espejo)
    .eq("id", proveedorId);

  if (updateError) return { espejo, error: updateError.message };
  return { espejo, error: null };
}

async function ensureSinglePrincipal(
  client: SupabaseClient,
  proveedorId: string,
  principalId: string,
): Promise<string | null> {
  const { error } = await client
    .from("proveedor_metodos_pago")
    .update({ es_principal: false })
    .eq("proveedor_id", proveedorId)
    .neq("id", principalId);
  return error?.message ?? null;
}

async function ensureAtLeastOnePrincipal(
  client: SupabaseClient,
  proveedorId: string,
): Promise<string | null> {
  const { data, error } = await listProveedorMetodosPago(client, proveedorId);
  if (error) return error;
  if (data.length === 0) return null;
  if (data.some((row) => row.es_principal)) return null;

  const { error: updateError } = await client
    .from("proveedor_metodos_pago")
    .update({ es_principal: true })
    .eq("id", data[0].id);
  return updateError?.message ?? null;
}

export async function insertProveedorMetodoPago(
  client: SupabaseClient,
  proveedorId: string,
  input: ProveedorMetodoPagoInput,
): Promise<{
  row: ProveedorMetodoPagoRow | null;
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const payload = toDbPayload(input);
  const { data: existing } = await listProveedorMetodosPago(client, proveedorId);
  const makePrincipal = payload.es_principal || existing.length === 0;

  const { data, error } = await client
    .from("proveedor_metodos_pago")
    .insert({
      proveedor_id: proveedorId,
      ...payload,
      es_principal: makePrincipal,
    })
    .select("*")
    .single();

  if (error) return { row: null, espejo: null, error: error.message };

  const row = data as ProveedorMetodoPagoRow;
  if (makePrincipal) {
    const clearError = await ensureSinglePrincipal(client, proveedorId, row.id);
    if (clearError) return { row, espejo: null, error: clearError };
  }

  const { espejo, error: syncError } = await syncProveedorEspejoMetodoPrincipal(
    client,
    proveedorId,
  );
  return { row, espejo, error: syncError };
}

export async function updateProveedorMetodoPago(
  client: SupabaseClient,
  proveedorId: string,
  metodoId: string,
  input: ProveedorMetodoPagoInput,
): Promise<{
  row: ProveedorMetodoPagoRow | null;
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const payload = toDbPayload(input);
  const { data, error } = await client
    .from("proveedor_metodos_pago")
    .update(payload)
    .eq("id", metodoId)
    .eq("proveedor_id", proveedorId)
    .select("*")
    .single();

  if (error) return { row: null, espejo: null, error: error.message };

  const row = data as ProveedorMetodoPagoRow;
  if (payload.es_principal) {
    const clearError = await ensureSinglePrincipal(client, proveedorId, row.id);
    if (clearError) return { row, espejo: null, error: clearError };
  } else {
    const ensureError = await ensureAtLeastOnePrincipal(client, proveedorId);
    if (ensureError) return { row, espejo: null, error: ensureError };
  }

  const { espejo, error: syncError } = await syncProveedorEspejoMetodoPrincipal(
    client,
    proveedorId,
  );
  return { row, espejo, error: syncError };
}

export async function deleteProveedorMetodoPago(
  client: SupabaseClient,
  proveedorId: string,
  metodoId: string,
): Promise<{
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const { error } = await client
    .from("proveedor_metodos_pago")
    .delete()
    .eq("id", metodoId)
    .eq("proveedor_id", proveedorId);

  if (error) return { espejo: null, error: error.message };

  const ensureError = await ensureAtLeastOnePrincipal(client, proveedorId);
  if (ensureError) return { espejo: null, error: ensureError };

  const { espejo, error: syncError } = await syncProveedorEspejoMetodoPrincipal(
    client,
    proveedorId,
  );
  return { espejo, error: syncError };
}

export async function setProveedorMetodoPagoPrincipal(
  client: SupabaseClient,
  proveedorId: string,
  metodoId: string,
): Promise<{
  espejo: ProveedorEspejoMetodoPago | null;
  error: string | null;
}> {
  const { error: setError } = await client
    .from("proveedor_metodos_pago")
    .update({ es_principal: true })
    .eq("id", metodoId)
    .eq("proveedor_id", proveedorId);

  if (setError) return { espejo: null, error: setError.message };

  const clearError = await ensureSinglePrincipal(client, proveedorId, metodoId);
  if (clearError) return { espejo: null, error: clearError };

  const { espejo, error: syncError } = await syncProveedorEspejoMetodoPrincipal(
    client,
    proveedorId,
  );
  return { espejo, error: syncError };
}

/** Inserta métodos al crear un proveedor y sincroniza el espejo. */
export async function replaceProveedorMetodosPago(
  client: SupabaseClient,
  proveedorId: string,
  inputs: ProveedorMetodoPagoInput[],
): Promise<{
  espejo: ProveedorEspejoMetodoPago;
  error: string | null;
}> {
  const { error: deleteError } = await client
    .from("proveedor_metodos_pago")
    .delete()
    .eq("proveedor_id", proveedorId);
  if (deleteError) {
    return { espejo: buildEspejoFromMetodo(null), error: deleteError.message };
  }

  if (inputs.length === 0) {
    const { espejo, error } = await syncProveedorEspejoMetodoPrincipal(
      client,
      proveedorId,
    );
    return { espejo, error };
  }

  let principalIndex = inputs.findIndex((item) => item.es_principal);
  if (principalIndex < 0) principalIndex = 0;

  const rows = inputs.map((input, index) => ({
    proveedor_id: proveedorId,
    ...toDbPayload({ ...input, es_principal: index === principalIndex }),
  }));

  const { error: insertError } = await client
    .from("proveedor_metodos_pago")
    .insert(rows);
  if (insertError) {
    return { espejo: buildEspejoFromMetodo(null), error: insertError.message };
  }

  const { espejo, error } = await syncProveedorEspejoMetodoPrincipal(
    client,
    proveedorId,
  );
  return { espejo, error };
}
