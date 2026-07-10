import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PagoRow } from "@/app/data/pagos";
import { groupPagosByProveedor } from "@/app/data/pagos";
import {
  computePaymentProjection,
  isProveedorSinCosto,
  type ProveedorRow,
} from "@/app/data/providers";
import type { BodaRow } from "@/app/data/weddings";

export type ClienteProyeccionContext = {
  boda: Pick<BodaRow, "nombre_pareja" | "fecha_boda" | "ciudad">;
  proveedores: ProveedorRow[];
  proveedoresSinCosto: ProveedorRow[];
  pagosByProveedor: Record<string, PagoRow[]>;
  totalContratado: number;
  totalPagado: number;
  saldoPendiente: number;
};

export async function getClienteProyeccionContext(
  client: SupabaseClient,
  bodaId: string,
): Promise<ClienteProyeccionContext | null> {
  const { data: boda, error: bodaError } = await client
    .from("bodas")
    .select("nombre_pareja, fecha_boda, ciudad")
    .eq("id", bodaId)
    .maybeSingle();

  if (bodaError || !boda) {
    return null;
  }

  const { data: proveedoresData } = await client
    .from("proveedores")
    .select("*")
    .eq("boda_id", bodaId)
    .eq("estado", "contratado")
    .order("categoria", { ascending: true });

  const allProveedores = (proveedoresData ?? []) as ProveedorRow[];
  const proveedores = allProveedores.filter(
    (provider) => !isProveedorSinCosto(provider),
  );
  const proveedoresSinCosto = allProveedores.filter((provider) =>
    isProveedorSinCosto(provider),
  );

  if (proveedores.length === 0 && proveedoresSinCosto.length === 0) {
    return null;
  }

  const providerIds = proveedores.map((provider) => provider.id);
  let pagosByProveedor: Record<string, PagoRow[]> = {};

  const { data: pagosData } = await client
    .from("pagos")
    .select("*")
    .in("proveedor_id", providerIds)
    .order("fecha_pago", { ascending: false });

  if (pagosData) {
    pagosByProveedor = groupPagosByProveedor(pagosData as PagoRow[]);
  }

  const { totalContratado, totalPagado, saldoPendiente } =
    computePaymentProjection(proveedores, pagosByProveedor);

  return {
    boda: boda as Pick<BodaRow, "nombre_pareja" | "fecha_boda" | "ciudad">,
    proveedores,
    proveedoresSinCosto,
    pagosByProveedor,
    totalContratado,
    totalPagado,
    saldoPendiente,
  };
}
