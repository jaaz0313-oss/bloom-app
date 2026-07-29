import type { SupabaseClient } from "@supabase/supabase-js";
import type { BodaRow } from "@/app/data/weddings";
import { getDaysSince } from "@/app/data/lead-alerts";
import { isBodaActiva } from "@/lib/boda-estado";

export type BodaInactivityAlert = {
  bodaId: string;
  nombrePareja: string;
  fechaBoda: string;
  ultimaActividadAt: string;
  diasSinActividad: number;
};

const INACTIVITY_THRESHOLD_DAYS = 15;

export { isBodaActiva } from "@/lib/boda-estado";

export type BodaLastActivityRow = {
  boda_id: string;
  ultima_actividad_at: string;
};

/** Mapa boda_id → ISO timestamp de la actividad más reciente. */
export type BodaLastActivityMap = Map<string, string>;

function maxIsoTimestamp(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

function rememberActivity(
  map: BodaLastActivityMap,
  bodaId: string | null | undefined,
  at: string | null | undefined,
) {
  if (!bodaId || !at) return;
  const current = map.get(bodaId);
  const next = maxIsoTimestamp(current, at);
  if (next) map.set(bodaId, next);
}

/**
 * Una sola RPC que agrega MAX(actividad) por boda_id desde:
 * bodas, proveedores, pagos, notas_boda, citas y tastings.
 * Si la RPC no está disponible, calcula el mismo mapa con consultas bulk.
 */
export async function fetchBodaLastActivityMap(
  supabase: SupabaseClient,
  bodaIds: string[],
): Promise<BodaLastActivityMap> {
  const map: BodaLastActivityMap = new Map();
  if (bodaIds.length === 0) return map;

  const bodaIdSet = new Set(bodaIds);

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_bodas_ultima_actividad",
  );

  if (!rpcError && Array.isArray(rpcData)) {
    for (const row of rpcData as BodaLastActivityRow[]) {
      if (!bodaIdSet.has(row.boda_id) || !row.ultima_actividad_at) continue;
      map.set(row.boda_id, row.ultima_actividad_at);
    }
    return map;
  }

  if (rpcError) {
    console.error(
      "[boda-alerts] get_bodas_ultima_actividad RPC failed, using fallback:",
      rpcError.message,
    );
  }

  const [
    proveedoresResult,
    notasResult,
    citasResult,
    tastingsResult,
  ] = await Promise.all([
    supabase
      .from("proveedores")
      .select("id, boda_id, created_at")
      .in("boda_id", bodaIds),
    supabase
      .from("notas_boda")
      .select("boda_id, created_at")
      .in("boda_id", bodaIds),
    supabase
      .from("citas")
      .select("boda_id, created_at")
      .in("boda_id", bodaIds),
    supabase
      .from("tastings")
      .select("boda_id, created_at")
      .in("boda_id", bodaIds),
  ]);

  const proveedorIds: string[] = [];
  const proveedorBodaById = new Map<string, string>();

  for (const row of (proveedoresResult.data ?? []) as Array<{
    id: string;
    boda_id: string;
    created_at?: string | null;
  }>) {
    proveedorIds.push(row.id);
    proveedorBodaById.set(row.id, row.boda_id);
    rememberActivity(map, row.boda_id, row.created_at ?? null);
  }

  if (proveedorIds.length > 0) {
    const { data: pagosData, error: pagosError } = await supabase
      .from("pagos")
      .select("proveedor_id, created_at")
      .in("proveedor_id", proveedorIds);

    if (pagosError) {
      console.error("[boda-alerts] pagos fallback:", pagosError.message);
    } else {
      for (const pago of (pagosData ?? []) as Array<{
        proveedor_id: string;
        created_at?: string | null;
      }>) {
        rememberActivity(
          map,
          proveedorBodaById.get(pago.proveedor_id),
          pago.created_at ?? null,
        );
      }
    }
  }

  for (const row of (notasResult.data ?? []) as Array<{
    boda_id: string;
    created_at?: string | null;
  }>) {
    rememberActivity(map, row.boda_id, row.created_at ?? null);
  }

  for (const row of (citasResult.data ?? []) as Array<{
    boda_id: string | null;
    created_at?: string | null;
  }>) {
    rememberActivity(map, row.boda_id, row.created_at ?? null);
  }

  for (const row of (tastingsResult.data ?? []) as Array<{
    boda_id: string;
    created_at?: string | null;
  }>) {
    rememberActivity(map, row.boda_id, row.created_at ?? null);
  }

  for (const result of [
    proveedoresResult,
    notasResult,
    citasResult,
    tastingsResult,
  ]) {
    if (result.error) {
      console.error("[boda-alerts] fallback query:", result.error.message);
    }
  }

  return map;
}

export function buildBodaInactivityAlerts(
  bodas: BodaRow[],
  lastActivityByBodaId: BodaLastActivityMap = new Map(),
  fromDate = new Date(),
  thresholdDays = INACTIVITY_THRESHOLD_DAYS,
): BodaInactivityAlert[] {
  const alerts: BodaInactivityAlert[] = [];

  for (const boda of bodas) {
    if (!isBodaActiva(boda.estado)) continue;

    const lastActivityAt = maxIsoTimestamp(
      lastActivityByBodaId.get(boda.id),
      boda.updated_at ?? boda.created_at,
    );
    if (!lastActivityAt) continue;

    const diasSinActividad = getDaysSince(lastActivityAt, fromDate);
    if (diasSinActividad < thresholdDays) continue;

    alerts.push({
      bodaId: boda.id,
      nombrePareja: boda.nombre_pareja,
      fechaBoda: boda.fecha_boda,
      ultimaActividadAt: lastActivityAt,
      diasSinActividad,
    });
  }

  return alerts.sort((a, b) => b.diasSinActividad - a.diasSinActividad);
}
