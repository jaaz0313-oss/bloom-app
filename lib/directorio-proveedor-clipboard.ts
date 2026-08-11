import type { DirectorioProveedorRow } from "@/app/data/directorio";

function hasText(value: string | null | undefined): value is string {
  return Boolean(value?.trim());
}

function line(label: string, value: string | null | undefined): string | null {
  if (!hasText(value)) return null;
  return `${label}: ${value.trim()}`;
}

/** Texto de contacto y pago listo para pegar en WhatsApp. */
export function buildDirectorioProveedorClipboardText(
  row: DirectorioProveedorRow,
): string {
  const blocks: string[] = [];

  const contactLines = [
    `📋 ${row.nombre.trim()}`,
    line("📂 Categoría", row.categoria),
    line("📍 Dirección", row.direccion),
    line("📞 Teléfono", row.telefono),
    line("✉️ Email", row.email),
  ].filter((entry): entry is string => entry != null);

  blocks.push(contactLines.join("\n"));

  const colombiaLines = [
    line("Banco", row.banco),
    line("Tipo de cuenta", row.tipo_cuenta),
    line("Número de cuenta", row.numero_cuenta),
    line("Titular", row.titular),
    line("NIT/Cédula", row.documento_nit),
    line("Swift", row.codigo_swift),
  ].filter((entry): entry is string => entry != null);

  if (colombiaLines.length > 0) {
    blocks.push(
      ["💳 Información de pago (Colombia):", ...colombiaLines].join("\n"),
    );
  }

  const usaLines = [
    line("Cuenta USA", row.cuenta_usa),
    line("PayPal", row.paypal),
  ].filter((entry): entry is string => entry != null);

  if (usaLines.length > 0) {
    blocks.push(
      ["🇺🇸 Información de pago (USA):", ...usaLines].join("\n"),
    );
  }

  return blocks.join("\n\n");
}
