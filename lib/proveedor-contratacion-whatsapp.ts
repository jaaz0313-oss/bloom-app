import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import {
  formatWeddingDateWhatsApp,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

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

export function buildProveedorContratadoGrupoMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  categoria: string,
  locale: WhatsAppLocale = "es",
  descripcionServicio?: string | null,
): string {
  const pareja = formatMessageLabel(boda.nombrePareja);
  const proveedor = formatMessageLabel(nombreProveedor);
  const cat = formatMessageLabel(categoria);
  const servicioLine = formatServicioLine(descripcionServicio, locale, "grupo");
  const servicioBlock = servicioLine ? `\n${servicioLine}` : "";

  if (locale === "en") {
    return `Hi ${pareja}, we confirm that ${proveedor} has been booked for your wedding 🎉
${cat}${servicioBlock}
Everything is coming together for your big day! 🌸
- Celestia Team`;
  }

  return `Hola ${pareja}, confirmamos que ${proveedor} ha sido contratado para su boda 🎉
${cat}${servicioBlock}
¡Todo va tomando forma para su gran día! 🌸
- Equipo Celestia`;
}

export function buildProveedorContratadoProveedorMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  locale: WhatsAppLocale = "es",
  descripcionServicio?: string | null,
): string {
  const proveedor = formatMessageLabel(nombreProveedor);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fechaBoda, locale)
      : formatWeddingDate(boda.fechaBoda);
  const ciudad = formatMessageLabel(boda.ciudad);
  const servicioLine = formatServicioLine(descripcionServicio, locale, "proveedor");
  const servicioBlock = servicioLine ? `\n${servicioLine}` : "";

  if (locale === "en") {
    return `Hi ${proveedor}, we confirm that you have been selected for the wedding of ${pareja} on ${fecha} in ${ciudad} 🎉${servicioBlock}
We will be in touch soon to coordinate the details.
Thank you for your trust!
- Celestia Team`;
  }

  return `Hola ${proveedor}, confirmamos que han sido seleccionados para la boda de ${pareja} el ${fecha} en ${ciudad} 🎉${servicioBlock}
Pronto estaremos en contacto para coordinar los detalles.
¡Gracias por su confianza!
- Equipo Celestia`;
}
