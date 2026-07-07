import type { BriefBodaRow } from "@/app/data/brief-boda";
import type { ContratoRow } from "@/app/data/contratos";
import type { BodaRow } from "@/app/data/weddings";

const BRIEF_META_KEYS = new Set(["id", "boda_id", "created_at", "updated_at"]);

export function hasClientInfoContent(boda: BodaRow): boolean {
  return Boolean(
    boda.nombre_novia?.trim() ||
      boda.nombre_novio?.trim() ||
      boda.telefono_novia?.trim() ||
      boda.telefono_novio?.trim() ||
      boda.email_novia?.trim() ||
      boda.email_novio?.trim() ||
      boda.direccion?.trim() ||
      boda.instagram_novia?.trim() ||
      boda.instagram_novio?.trim() ||
      boda.documento_novia?.trim() ||
      boda.documento_novio?.trim() ||
      boda.whatsapp_grupo_link?.trim(),
  );
}

export function hasBriefContent(brief: BriefBodaRow | null): boolean {
  if (!brief) return false;

  return Object.entries(brief).some(([key, value]) => {
    if (BRIEF_META_KEYS.has(key)) return false;
    if (typeof value === "boolean") return value;
    if (value === null || value === undefined) return false;
    return String(value).trim().length > 0;
  });
}

export function hasContratoContent(
  contrato: ContratoRow | null,
  boda: Pick<BodaRow, "honorarios" | "anticipo_honorarios" | "lugar_venue">,
): boolean {
  return Boolean(
    contrato ||
      boda.honorarios !== null ||
      boda.anticipo_honorarios !== null ||
      boda.lugar_venue?.trim(),
  );
}
