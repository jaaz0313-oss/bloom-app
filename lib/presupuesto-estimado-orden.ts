import { supabase } from "@/lib/supabase";

/**
 * Persiste el orden de ítems del presupuesto estimado.
 * Crea filas faltantes (categorías del cronograma sin registro) con valor 0.
 */
export async function persistPresupuestoEstimadoOrden(params: {
  bodaId: string;
  categorias: string[];
  existingByCategoriaKey: Map<
    string,
    { id: string; categoria: string }
  >;
}): Promise<
  | { ok: true; rows: Array<Record<string, unknown>> }
  | { ok: false; message: string }
> {
  if (!supabase) {
    return { ok: false, message: "Supabase no está configurado." };
  }

  const categoryKey = (categoria: string) =>
    categoria.trim().toLowerCase();

  const upserted: Array<Record<string, unknown>> = [];

  for (let index = 0; index < params.categorias.length; index++) {
    const categoria = params.categorias[index];
    const key = categoryKey(categoria);
    const existing = params.existingByCategoriaKey.get(key);

    if (existing) {
      const { data, error } = await supabase
        .from("presupuesto_estimado_categorias")
        .update({
          orden: index,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) {
        return { ok: false, message: error.message };
      }
      if (data) upserted.push(data as Record<string, unknown>);
    } else {
      const { data, error } = await supabase
        .from("presupuesto_estimado_categorias")
        .insert({
          boda_id: params.bodaId,
          categoria,
          valor_estimado: 0,
          orden: index,
        })
        .select("*")
        .single();

      if (error) {
        return { ok: false, message: error.message };
      }
      if (data) upserted.push(data as Record<string, unknown>);
    }
  }

  return { ok: true, rows: upserted };
}
