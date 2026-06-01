import "server-only";

import type { CotizacionItemRow, CotizacionRow } from "@/app/data/cotizaciones";
import type { LeadRow } from "@/app/data/leads";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LeadCotizacionPdfContext = {
  lead: LeadRow;
  cotizacion: CotizacionRow;
  items: CotizacionItemRow[];
};

export function pickActiveLeadCotizacion(
  cotizaciones: CotizacionRow[],
): CotizacionRow | null {
  const active = cotizaciones
    .filter((c) => c.estado !== "rechazada")
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return active[0] ?? null;
}

export function getLeadCotizacionDisplayItems(
  items: CotizacionItemRow[],
): CotizacionItemRow[] {
  return items.filter((item) => item.incluido);
}

export async function getLeadCotizacionPdfContext(
  supabase: SupabaseClient,
  leadId: string,
): Promise<LeadCotizacionPdfContext | null> {
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError || !lead) return null;

  const { data: cotizaciones, error: cotError } = await supabase
    .from("cotizaciones")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (cotError) return null;

  const cotizacion = pickActiveLeadCotizacion(
    (cotizaciones ?? []) as CotizacionRow[],
  );
  if (!cotizacion) return null;

  const { data: items, error: itemsError } = await supabase
    .from("cotizacion_items")
    .select("*")
    .eq("cotizacion_id", cotizacion.id)
    .order("categoria", { ascending: true });

  if (itemsError) return null;

  const displayItems = getLeadCotizacionDisplayItems(
    (items ?? []) as CotizacionItemRow[],
  );
  if (displayItems.length === 0) return null;

  return {
    lead: lead as LeadRow,
    cotizacion,
    items: displayItems,
  };
}
