import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export type CotizacionBodaContext = {
  nombrePareja: string;
  fechaBoda: string;
  ciudad: string;
};

export type CotizacionMensajeTipo = "primer_contacto" | "post_reunion";

export function buildSolicitudCotizacionMessage(
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
): string {
  const fecha = formatWeddingDate(boda.fechaBoda);
  const proveedor = formatMessageLabel(nombreProveedor);
  const planner = formatMessageLabel(nombrePlanner);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const ciudad = formatMessageLabel(boda.ciudad);
  const servicio = formatMessageLabel(categoria);

  return `Hola ${proveedor}, soy ${planner} de Celestia. Estamos en el proceso de planeación de la boda de ${pareja} el ${fecha} en ${ciudad}. ¿Nos podrías enviar tu cotización para ${servicio}? Muchas gracias.`;
}

export function buildSolicitudCotizacionPostReunionMessage(
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
): string {
  const fecha = formatWeddingDate(boda.fechaBoda);
  const proveedor = formatMessageLabel(nombreProveedor);
  const planner = formatMessageLabel(nombrePlanner);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const ciudad = formatMessageLabel(boda.ciudad);
  const servicio = formatMessageLabel(categoria);

  return `Hola ${proveedor}, soy ${planner} de Celestia. Fue un placer reunirnos. Como quedamos, te pedimos el favor de enviarnos tu cotización para la boda de ${pareja} el ${fecha} en ${ciudad} para ${servicio}. Muchas gracias.`;
}

export function buildCotizacionMessageByTipo(
  tipo: CotizacionMensajeTipo,
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
): string {
  if (tipo === "post_reunion") {
    return buildSolicitudCotizacionPostReunionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
    );
  }
  return buildSolicitudCotizacionMessage(
    nombreProveedor,
    nombrePlanner,
    boda,
    categoria,
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
): boolean {
  return openCotizacionWhatsApp(
    telefono,
    buildSolicitudCotizacionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
    ),
  );
}

export function openCotizacionWhatsAppPostReunion(
  telefono: string,
  nombreProveedor: string,
  nombrePlanner: string,
  boda: CotizacionBodaContext,
  categoria: string,
): boolean {
  return openCotizacionWhatsApp(
    telefono,
    buildSolicitudCotizacionPostReunionMessage(
      nombreProveedor,
      nombrePlanner,
      boda,
      categoria,
    ),
  );
}
