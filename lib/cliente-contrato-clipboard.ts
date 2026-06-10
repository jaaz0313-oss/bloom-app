import type { ContratoFirmante } from "@/app/data/contratos";
import type { BodaRow } from "@/app/data/weddings";

type ClienteContratoClipboardBoda = Pick<
  BodaRow,
  | "nombre_pareja"
  | "nombre_novia"
  | "nombre_novio"
  | "tipo_documento"
  | "tipo_documento_novia"
  | "tipo_documento_novio"
  | "documento_novia"
  | "documento_novio"
  | "direccion"
  | "telefono_novia"
  | "telefono_novio"
  | "email_novia"
  | "email_novio"
>;

function displayValue(value: string | null | undefined): string {
  return value?.trim() || "—";
}

export function buildClienteContratoClipboardText(
  boda: ClienteContratoClipboardBoda,
  firmante: ContratoFirmante = "novia",
): string {
  const isNovio = firmante === "novio";

  const nombre = isNovio
    ? boda.nombre_novio?.trim() ||
      boda.nombre_pareja.split(/\s+y\s+/i).pop()?.trim() ||
      boda.nombre_pareja.trim()
    : boda.nombre_novia?.trim() || boda.nombre_pareja.trim();

  const tipoDocumento = isNovio
    ? boda.tipo_documento_novio
    : (boda.tipo_documento_novia ?? boda.tipo_documento);

  const numeroDocumento = isNovio
    ? boda.documento_novio
    : boda.documento_novia;

  const telefono = isNovio ? boda.telefono_novio : boda.telefono_novia;
  const email = isNovio ? boda.email_novio : boda.email_novia;

  const documentoParts = [tipoDocumento?.trim(), numeroDocumento?.trim()].filter(
    Boolean,
  );
  const documento =
    documentoParts.length > 0 ? documentoParts.join(" ") : "—";

  return [
    `Nombre: ${displayValue(nombre)}`,
    `Documento: ${documento}`,
    `Dirección: ${displayValue(boda.direccion)}`,
    `Teléfono: ${displayValue(telefono)}`,
    `Email: ${displayValue(email)}`,
  ].join("\n");
}
