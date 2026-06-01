import { formatMessageLabel, formatWeddingDate } from "@/lib/format";
import type { CotizacionBodaContext } from "@/lib/proveedor-cotizacion";

export function buildProveedorContratadoGrupoMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
  categoria: string,
): string {
  const pareja = formatMessageLabel(boda.nombrePareja);
  const proveedor = formatMessageLabel(nombreProveedor);
  const cat = formatMessageLabel(categoria);

  return `Hola ${pareja}, confirmamos que ${proveedor} ha sido contratado para su boda 🎉
${cat}
¡Todo va tomando forma para su gran día! 🌸
- Equipo Celestia`;
}

export function buildProveedorContratadoProveedorMessage(
  boda: CotizacionBodaContext,
  nombreProveedor: string,
): string {
  const proveedor = formatMessageLabel(nombreProveedor);
  const pareja = formatMessageLabel(boda.nombrePareja);
  const fecha = formatWeddingDate(boda.fechaBoda);
  const ciudad = formatMessageLabel(boda.ciudad);

  return `Hola ${proveedor}, confirmamos que han sido seleccionados para la boda de ${pareja} el ${fecha} en ${ciudad} 🎉
Pronto estaremos en contacto para coordinar los detalles.
¡Gracias por su confianza!
- Equipo Celestia`;
}
