import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";
import {
  formatWeddingDateWhatsApp,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

export function buildProveedorContratadoGrupoMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  categoria: string,
  locale: WhatsAppLocale = "es",
): string {
  const pareja = formatMessageLabel(boda.nombrePareja);
  const proveedor = formatMessageLabel(nombreProveedor);
  const cat = formatMessageLabel(categoria);

  if (locale === "en") {
    return `Hi ${pareja}, we confirm that ${proveedor} has been booked for your wedding 🎉
${cat}
Everything is coming together for your big day! 🌸
- Celestia Team`;
  }

  return `Hola ${pareja}, confirmamos que ${proveedor} ha sido contratado para su boda 🎉
${cat}
¡Todo va tomando forma para su gran día! 🌸
- Equipo Celestia`;
}

export function buildProveedorContratadoProveedorMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  locale: WhatsAppLocale = "es",
): string {
  const proveedor = formatMessageLabel(nombreProveedor);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fechaBoda, locale)
      : formatWeddingDate(boda.fechaBoda);
  const ciudad = formatMessageLabel(boda.ciudad);

  if (locale === "en") {
    return `Hi ${proveedor}, we confirm that you have been selected for the wedding of ${pareja} on ${fecha} in ${ciudad} 🎉
We will be in touch soon to coordinate the details.
Thank you for your trust!
- Celestia Team`;
  }

  return `Hola ${proveedor}, confirmamos que han sido seleccionados para la boda de ${pareja} el ${fecha} en ${ciudad} 🎉
Pronto estaremos en contacto para coordinar los detalles.
¡Gracias por su confianza!
- Equipo Celestia`;
}
