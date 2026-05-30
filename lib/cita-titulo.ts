import type { CitaTipo } from "@/app/data/citas";

type ProveedorTitulo = {
  nombre: string;
  categoria: string;
};

export function getCitaRelacionNombre(params: {
  relacionTipo: "ninguna" | "boda" | "lead";
  bodaId: string;
  leadId: string;
  bodasById: Record<string, { nombre_pareja: string }>;
  leadsById: Record<string, { nombre_pareja: string }>;
}): string {
  const { relacionTipo, bodaId, leadId, bodasById, leadsById } = params;
  if (relacionTipo === "boda" && bodaId) {
    return bodasById[bodaId]?.nombre_pareja?.trim() ?? "";
  }
  if (relacionTipo === "lead" && leadId) {
    return leadsById[leadId]?.nombre_pareja?.trim() ?? "";
  }
  return "";
}

export function buildAutoCitaTitulo(params: {
  tipo: CitaTipo;
  relacionNombre: string;
  proveedor: ProveedorTitulo | null;
}): string {
  const { tipo, proveedor } = params;
  const nombre = params.relacionNombre.trim();

  switch (tipo) {
    case "reunion_proveedor": {
      if (!proveedor) return "";
      const categoria = proveedor.categoria.trim() || "Proveedor";
      const proveedorNombre = proveedor.nombre.trim();
      const pareja = nombre || "Sin pareja";
      return `Reunión ${categoria} - ${proveedorNombre} | ${pareja}`;
    }
    case "primera_reunion":
      return nombre ? `Primera reunión | ${nombre}` : "Primera reunión";
    case "reunion_seguimiento":
      return nombre ? `Reunión de seguimiento | ${nombre}` : "Reunión de seguimiento";
    case "reunion_planificacion":
      return nombre
        ? `Reunión de planificación | ${nombre}`
        : "Reunión de planificación";
    default:
      return "";
  }
}

/** Extrae categoría y nombre del título de reunión con proveedor (para edición). */
export function parseProveedorFromCitaTitulo(titulo: string): ProveedorTitulo | null {
  const trimmed = titulo.trim();
  const match =
    trimmed.match(/^Reunión\s+(.+?)\s+-\s+(.+?)\s+\|/) ||
    trimmed.match(/^Reunión\s+"(.+?)\s+-\s+(.+?)\s+\|/);
  if (!match) return null;
  return {
    categoria: match[1].trim(),
    nombre: match[2].trim(),
  };
}
