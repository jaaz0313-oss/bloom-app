import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import {
  formatCurrencyWhatsApp,
  formatWeddingDateWhatsApp,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

function formatValorContratadoLine(
  valorTotal: number | null | undefined,
  locale: WhatsAppLocale,
): string {
  if (valorTotal == null || !Number.isFinite(valorTotal) || valorTotal <= 0) {
    return "";
  }

  const monto = formatCurrencyWhatsApp(valorTotal, locale);
  if (locale === "en") {
    return `💰 Contracted amount: ${monto}`;
  }

  return `💰 Valor contratado: ${monto}`;
}

function formatServicioLine(
  descripcionServicio: string | null | undefined,
  locale: WhatsAppLocale,
  variant: "grupo" | "proveedor",
): string {
  const descripcion = descripcionServicio?.trim();
  if (!descripcion) return "";

  if (locale === "en") {
    return variant === "grupo"
      ? `📋 Booked service: ${descripcion}`
      : `📋 Service: ${descripcion}`;
  }

  return variant === "grupo"
    ? `📋 Servicio contratado: ${descripcion}`
    : `📋 Servicio: ${descripcion}`;
}

function buildOptionalDetailBlock(
  valorTotal: number | null | undefined,
  descripcionServicio: string | null | undefined,
  locale: WhatsAppLocale,
  variant: "grupo" | "proveedor",
): string {
  const lines = [
    formatValorContratadoLine(valorTotal, locale),
    formatServicioLine(descripcionServicio, locale, variant),
  ].filter(Boolean);

  return lines.length > 0 ? `\n${lines.join("\n")}` : "";
}

export function buildProveedorContratadoGrupoMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  categoria: string,
  locale: WhatsAppLocale = "es",
  descripcionServicio?: string | null,
  valorTotal?: number | null,
): string {
  const pareja = formatMessageLabel(boda.nombrePareja);
  const proveedor = formatMessageLabel(nombreProveedor);
  const cat = formatMessageLabel(categoria);
  const detailBlock = buildOptionalDetailBlock(
    valorTotal,
    descripcionServicio,
    locale,
    "grupo",
  );

  if (locale === "en") {
    return `Hi ${pareja}, we confirm that ${proveedor} has been booked for your wedding 🎉
${cat}${detailBlock}
Everything is coming together for your big day! 🌸
- Celestia Team`;
  }

  return `Hola ${pareja}, confirmamos que ${proveedor} ha sido contratado para su boda 🎉
${cat}${detailBlock}
¡Todo va tomando forma para su gran día! 🌸
- Equipo Celestia`;
}

export function buildProveedorContratadoProveedorMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  locale: WhatsAppLocale = "es",
  descripcionServicio?: string | null,
  valorTotal?: number | null,
): string {
  const proveedor = formatMessageLabel(nombreProveedor);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fechaBoda, locale)
      : formatWeddingDate(boda.fechaBoda);
  const ciudad = formatMessageLabel(boda.ciudad);
  const detailBlock = buildOptionalDetailBlock(
    valorTotal,
    descripcionServicio,
    locale,
    "proveedor",
  );

  if (locale === "en") {
    return `Hi ${proveedor}, we confirm that you have been selected for the wedding of ${pareja} on ${fecha} in ${ciudad} 🎉${detailBlock}
We will be in touch soon to coordinate the details.
Thank you for your trust!
- Celestia Team`;
  }

  return `Hola ${proveedor}, confirmamos que han sido seleccionados para la boda de ${pareja} el ${fecha} en ${ciudad} 🎉${detailBlock}
Pronto estaremos en contacto para coordinar los detalles.
¡Gracias por su confianza!
- Equipo Celestia`;
}
