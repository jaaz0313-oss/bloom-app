import { formatCurrency } from "@/lib/format";
import { buildGrupoWhatsAppUrl } from "@/lib/whatsapp";

export type ProveedorParaComparar = {
  nombre: string;
  monto_cotizado: number | null;
  descripcion_servicio: string | null;
};

export function buildCompararCotizacionesMessage(
  categoria: string,
  proveedores: ProveedorParaComparar[],
): string {
  const bloques = proveedores.map((p) => {
    const monto =
      p.monto_cotizado != null && p.monto_cotizado > 0
        ? formatCurrency(p.monto_cotizado)
        : "Por definir";
    const descripcion = p.descripcion_servicio?.trim();
    let linea = `- ${p.nombre}: ${monto}`;
    if (descripcion) {
      linea += `\n  ${descripcion}`;
    }
    return linea;
  });

  return `Hola, ya tenemos las cotizaciones para ${categoria}:

${bloques.join("\n\n")}

¿Cuál prefieren? Quedamos atentos 🌸`;
}

export async function enviarComparacionCotizaciones(
  grupoLink: string | null | undefined,
  message: string,
): Promise<"opened" | "copied"> {
  const url = grupoLink?.trim()
    ? buildGrupoWhatsAppUrl(grupoLink, message)
    : null;

  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
    return "opened";
  }

  await navigator.clipboard.writeText(message);
  return "copied";
}
