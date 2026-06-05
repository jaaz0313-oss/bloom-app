import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  formatWeddingDateWhatsApp,
  type WhatsAppLocale,
} from "@/lib/whatsapp-locale";

export type CotizacionBodaContext = {
  nombrePareja: string;
  fechaBoda: string;
  ciudad: string;
  whatsappGrupoLink?: string | null;
  telefonoNovia?: string | null;
};

export type CotizacionMensajeTipo = "primer_contacto" | "post_reunion";

export function buildSolicitudCotizacionMessage(
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
  locale: WhatsAppLocale = "es",
): string {
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fechaBoda, locale)
      : formatWeddingDate(boda.fechaBoda);
  const proveedor = formatMessageLabel(nombreProveedor);
  const planner = formatMessageLabel(nombrePlanner);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const ciudad = formatMessageLabel(boda.ciudad);
  const servicio = formatMessageLabel(categoria);

  if (locale === "en") {
    return `Hi ${proveedor}, I'm ${planner} from Celestia. We are planning the wedding of ${pareja} on ${fecha} in ${ciudad}. Could you please send us your quote for ${servicio}? Thank you very much.`;
  }

  return `Hola ${proveedor}, soy ${planner} de Celestia. Estamos en el proceso de planeación de la boda de ${pareja} el ${fecha} en ${ciudad}. ¿Nos podrías enviar tu cotización para ${servicio}? Muchas gracias.`;
}

export function buildSolicitudCotizacionPostReunionMessage(
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
  locale: WhatsAppLocale = "es",
): string {
  const fecha =
    locale === "en"
      ? formatWeddingDateWhatsApp(boda.fechaBoda, locale)
      : formatWeddingDate(boda.fechaBoda);
  const proveedor = formatMessageLabel(nombreProveedor);
  const planner = formatMessageLabel(nombrePlanner);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const ciudad = formatMessageLabel(boda.ciudad);
  const servicio = formatMessageLabel(categoria);

  if (locale === "en") {
    return `Hi ${proveedor}, I'm ${planner} from Celestia. It was a pleasure meeting with you. As discussed, we kindly ask you to send us your quote for the wedding of ${pareja} on ${fecha} in ${ciudad} for ${servicio}. Thank you very much.`;
  }

  return `Hola ${proveedor}, soy ${planner} de Celestia. Fue un placer reunirnos. Como quedamos, te pedimos el favor de enviarnos tu cotización para la boda de ${pareja} el ${fecha} en ${ciudad} para ${servicio}. Muchas gracias.`;
}

export function buildCotizacionMessageByTipo(
  tipo: CotizacionMensajeTipo,
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
  locale: WhatsAppLocale = "es",
): string {
  if (tipo === "post_reunion") {
    return buildSolicitudCotizacionPostReunionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
      locale,
    );
  }
  return buildSolicitudCotizacionMessage(
    nombreProveedor,
    nombrePlanner,
    boda,
    categoria,
    locale,
  );
}

export function openCotizacionWhatsApp(
  telefono: string,
  message: string,
): boolean {
  const url = buildWhatsAppUrl(telefono, message);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function openCotizacionWhatsAppPrimerContacto(
  telefono: string,
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
  locale: WhatsAppLocale = "es",
): boolean {
  return openCotizacionWhatsApp(
    telefono,
    buildSolicitudCotizacionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
      locale,
    ),
  );
}

export function openCotizacionWhatsAppPostReunion(
  telefono: string,
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
  locale: WhatsAppLocale = "es",
): boolean {
  return openCotizacionWhatsApp(
    telefono,
    buildSolicitudCotizacionPostReunionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
      locale,
    ),
  );
}
