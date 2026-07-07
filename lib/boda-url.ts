export const BODA_SECTION_PROVEEDORES = "proveedores";
export const BODA_SECTION_TASTINGS = "tastings";

export function bodaProveedoresHref(
  bodaId: string,
  proveedorId?: string,
): string {
  const params = new URLSearchParams({ section: BODA_SECTION_PROVEEDORES });
  if (proveedorId) {
    params.set("proveedor", proveedorId);
  }
  return `/bodas/${bodaId}?${params.toString()}`;
}

export function bodaTastingsHref(bodaId: string): string {
  const params = new URLSearchParams({ section: BODA_SECTION_TASTINGS });
  return `/bodas/${bodaId}?${params.toString()}`;
}
